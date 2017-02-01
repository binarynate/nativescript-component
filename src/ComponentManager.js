import { validate } from 'parameter-validator';
import { Page } from 'ui/page';

/**
* The `Component` class defines the behavior for a single component instance, however the
* NativeScript framework expects a view module to export functions which handle *all*
* instances of the view. Because of this, this ComponentManager class does two things:
*
* - Exports module-level functions which NativeScript calls for all instances of the view like it requires.
* - Allows each instance of the view to have its own Component instance and, thus, independent state.
*   It does this by maintaining a list of loaded component instances under the hood
*   and proxying invocation of module-level functions to the corresponding method the correct Component instance.
*
* @private
*/
class ComponentManager {

    /**
    * @param {Object} options
    * @param {Class}  options.componentClass
    */
    constructor(options) {

        validate(options, [ 'componentClass' ], this);
        this._instances = []; // For keeping track of the instances of the component that are currently loaded.
        this._addProxyMethods();
    }


    /**
    * Exports the component's public methods as named exports for a module.
    * @private
    */
    export(moduleExports) {

        let publicMethodNames = this._getPublicMethodNames();

        for (let methodName of publicMethodNames) {
            moduleExports[methodName] = this[methodName].bind(this);
        }
    }

    /**
    * Creates a new component instance, assigns it and its view a component ID, and
    * attaches an event listener so that the reference to the component is removed
    * upon the view's `unloaded` event.
    *
    * @param   {ui/View} view
    * @returns {Component}
    * @private
    */
    _addNewComponent(view) {

        let component = new this.componentClass();
        let componentId = generateUuid();
        component._id = componentId;
        // Note: component.set() can't yet be used to set the _componentId on the component's binding context,
        // because using component.set() before the component.onLoaded() prevents variables in XML attributes
        // from being bound to the component correctly. So, the _componentId is set on the binding context
        // *after* the initialization method is invoked.
        component._view = view;
        this._instances.push(component);

        if (this.componentClass.isSingleton) {
            // Singleton components are kept alive throughout the life of the application, so we should attach the event
            // listener that removes the component when its view is unloaded.
            return component;
        }

        // By default, components are not created as singletons, so each component instance is released when its
        // view is unloaded.
        view.on(Page.unloadedEvent, options => {

            let view = options.object;

            if (!view.bindingContext) {
                this._error(`Cannot deallocate component for view, because view has no binding context.`);
                return;
            }

            let componentId = this._getComponentId(view.bindingContext);
            let componentIndex = this._instances.findIndex(({ _id }) => _id === componentId);

            if (componentIndex === -1) {
                this._error(`Cannot deallocate component for view, because no component matches the view's component ID of '${componentId}'`);
                return;
            }

            this._instances.splice(componentIndex, 1);
        });
        return component;
    }

    _addProxyMethods() {

        let initializationHooks = [ 'onLoaded', 'onNavigatingTo', 'onNavigatedTo', 'onShownModally' ];

        let publicMethodNames = this._getPublicMethodNames();

        for (let methodName of publicMethodNames) {

            if (initializationHooks.includes(methodName)) {
                this._addInitHookProxyMethod(methodName);
            } else {
                this._addProxyMethod(methodName);
            }
        }
    }

    /**
    * Adds a method to this instance which does the following:
    *
    * - Checks if the view already has an ID.
    *   - If so:
    *       - Looks up the component instance that matches that view
    *       - Proxy the function call to that instance
    *   - If not:
    *       - creates a component instance and give it an ID.
    *       - Attach the event listener for the unload event
    *       - Add the component to _instances
    *       - Proxy the function call to that instance
    *
    * @param {string} methodName
    * @private
    */
    _addInitHookProxyMethod(methodName) {

        /**
        * @param {Object}  options
        * @param {ui/View} options.object
        * @private
        */
        this[methodName] = (...args) => {

            let [ options ] = args,
                view = options.object,
                newComponentAdded = false;

            let component = this._getComponentForRootView(view);

            if (!component && this.componentClass.isSingleton && this._instances[0]) {
                component = this._instances[0];
            }

            if (!component) {
                component = this._addNewComponent(view);
                newComponentAdded = true;
            }

            // Proxy the function call to the matching component instance.
            let result = component[methodName](...args);

            if (newComponentAdded) {
                // The _componentId is set *after* the init hook is proxied, because calling
                // component.set() before the initialization hook is invoked prevents variables
                // passed as XML attributes from being bound correctly.
                component.set('_componentId', component._id);
            }
            return result;
        };
    }

    /**
    * Adds a method to this instance which does the following:
    *
    * - Looks up the component instance for the given view.
    * - Proxies the function call to that component instance.
    *
    * @private
    */
    _addProxyMethod(methodName) {

        /**
        * @param {Object}  options
        * @param {ui/View} options.object
        * @private
        */
        this[methodName] = (...args) => {

            let [ options ] = args;
            let view = options.object;
            let component;

            if (this.componentClass.isSingleton) {

                component = this._instances[0];

                if (!component) {
                    let message = `Method '${methodName}' called for singleton component ${this.componentClass.name}, ` +
                                  `but the component has not been instantiated yet. Please ensure that one of the component's ` +
                                  `lifecycle hooks (e.g. onLoaded, onNavigatingTo) are hooked up in its template.`;
                    this._error(message);
                    return;
                }
            } else {
                component = this._getComponentForNestedView(view);
            }
            // Proxy the function call to the matching component instance.
            return component[methodName](...args);
        };
    }

    /**
    * Returns the value of a `bindingContext` object's property, regardless of whether
    * the `bindingContext` is an Observable instance or a plain object.
    *
    * @private
    */
    _getBindingContextProperty(bindingContext, propertyName) {

        if (typeof bindingContext.get === 'function') {
            // bindingContext is observable, so use its `get` function.
            return bindingContext.get(propertyName);
        }
        // bindingContext is not observable, so treat it like a plain object.
        return bindingContext[propertyName];
    }

    _getComponentId(bindingContext) {
        return this._getBindingContextProperty(bindingContext, '_componentId');
    }

    /**
    * Returns the component instance that matches the view's component ID or null
    * if the view has no component ID.
    *
    * @param   {ui/View} view
    * @returns {Component|null}
    * @private
    */
    _getComponentForRootView(view) {

        if (!view.bindingContext) {
            return null;
        }
        let componentId = this._getComponentId(view.bindingContext);

        if (!componentId) {
            return null;
        }
        let component = this._instances.find(({ _id }) => _id === componentId);
        return component || null;
    }

    /**
    * For the given view nested within a component, this method traverses the XML tree until it finds
    * a view with a _componentId. That view is the component's root view, and the _componentId is used
    * to look up and return the component.
    *
    * @param   {ui/View} view
    * @returns {Component}
    * @private
    */
    _getComponentForNestedView(view, maxIterations = 500) {

        if (maxIterations < 1) {
            // This shouldn't ever happen, but is included in case to prevent infinite recursion.
            throw new Error(`Couldn't locate the component containing the ${view.typeName} view, because the maximum number of iterations was reached.`);
        }

        if (view.bindingContext && this._getComponentId(view.bindingContext)) {
            // We found the component's root view containing the component ID, so now we can find and return the right component.
            let componentId = this._getComponentId(view.bindingContext);
            let component = this._instances.find(({ _id }) => _id === componentId);

            if (component) {
                return component;
            }
            // This error would indicate that an event from a nested component bubbled up to and was handled by this component, which shouldn't happen.
            throw new Error(`Couldn't locate the component containing the ${view.typeName} view; a view with component ID '${componentId}' was found, but no component matches that ID`);
        }

        // There's no _componentId defined for this view, which is normal if the view is that of a tag
        // embedded within a component. That's OK - let's just try its parent until we get to the component's root view.
        if (view._parent) {
            return this._getComponentForNestedView(view._parent, --maxIterations);
        }
        // This shouldn't ever happen, either.
        throw new Error(`Couldn't locate the component containing the ${view.typeName} view; the root view was reached without encountering a component ID.`);
    }

    _getPublicMethodNames() {

        let instance = new this.componentClass();

        let publicMethodNames = getAllPropertyNames(instance).filter(key => {

            let value;
            try {
                value = instance[key];
            } catch (error) {}

            return (typeof value === 'function') && (key[0] !== '_') && (key !== 'constructor');
        });

        return publicMethodNames;
    }

    _log(message) {
        console.log(`nativescript-component: ${message}`);
    }

    _warn(message) {
        this._log(`WARN: ${message}`);
    }

    _error(message) {
        this._log(`ERROR: ${message}`);
    }
}

export default ComponentManager;

function getAllPropertyNames(object, propertyNames = []) {

    propertyNames.push(...Object.getOwnPropertyNames(object));
    let prototype = Object.getPrototypeOf(object);
    return prototype === Object.prototype ? propertyNames : getAllPropertyNames(prototype, propertyNames);
}

/**
* Creates a v4 uuid (a random number in the form of a UUID).
*
* http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
* @private
*/
function generateUuid() {
    return `${s4()+s4()}-${s4()}-${s4()}-${s4()}-${s4()+s4()+s4()}`;
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}
