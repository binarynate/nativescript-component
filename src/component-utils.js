

/**
* Returns the value of a `bindingContext` object's property, regardless of whether
* the `bindingContext` is an Observable instance or a plain object.
*
* @private
*/
export function getBindingContextProperty(bindingContext, propertyName) {

    if (typeof bindingContext.get === 'function') {
        // bindingContext is observable, so use its `get` function.
        return bindingContext.get(propertyName);
    }
    // bindingContext is not observable, so treat it like a plain object.
    return bindingContext[propertyName];
}

/**
* For the given view nested within a component, this method traverses the XML tree until it finds
* a view with a `_component` property. That view is the component's root view, and the `_component` property is used
* to look up and return the component.
*
* @param   {ui/View} view
* @returns {Component|null} - The view's component, or `null` if the view is not nested within a component.
* @private
*/
export function getComponentForView(view, maxIterations = 500) {

    if (maxIterations < 1) {
        // This shouldn't ever happen, but is included in case to prevent infinite recursion.
        throw new Error(`Couldn't locate the component containing the ${view.typeName} view, because the maximum number of iterations was reached.`);
    }

    if (view.bindingContext && getBindingContextProperty(view.bindingContext, '_component')) {

        let component = getBindingContextProperty(view.bindingContext, '_component');
        return component;
    }

    // There's no `_component` defined for this view, which is normal if the view is that of a tag
    // embedded within a component. That's OK - let's just try its parent until we get to the component's root view.
    if (view._parent) {
        return getComponentForView(view._parent, --maxIterations);
    }
    return null;
}
