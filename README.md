# nativescript-component

A simple way to create reusable NativeScript components *without* Angular.

## Benefits

* __Simple API__ for defining a component and binding properties to it.
* __Multiple instances__ of a single component can be used in a page.
* Each component instance is automatically given its own __separate state__.
* __Automatically binds__ XML attributes to the component's binding context.
* Parent components are initialized before their children, so parents can safely pass values and dependencies to their children.
* Automatically binds context properties passed to the component view `navigate()` and `showModal()`.
* A component instance is __automatically disposed__ upon its view's `unloaded` event by default.
* A component can instead be defined as a __singleton__ so that a single instance is kept throughout the application's lifetime.

## Installation

```
npm install nativescript-component --save
```

## Example

In this example, we'll create a parent component named `details-page` which uses multiple instances of another component named `editable-text` to allow a user data record to viewed and edited.

### Directory structure

```
app
 |
 |-- components
     |
     |-- details-page
     |    |
     |    |-- details-page.xml
     |    |-- details-page.js
     |
     |-- editable-text
          |
          |-- editable-text.xml
          |-- editable-text.js
```

Styles are omitted from this example for simplicity, but it's good practice to group the component's styles in its directory (e.g. `details-page/details-page.css` and `editable-text/editable-text.css`). Check out the Nativescript [LESS](https://www.npmjs.com/package/nativescript-dev-less) and [SASS](https://www.npmjs.com/package/nativescript-dev-sass) precompiler plugins for clean styling.

### details-page.xml

The `details-page` component's template consists of an `ActionBar` with a single control: a button that for toggling the UI from "view" mode to "edit" mode and vice versa; and a `GridLayout` listing our fields: first name and last name.

```xml
<Page navigatingTo="onNavigatingTo" xmlns:e="components/editable-text">

    <Page.actionBar>
        <ActionBar title="User Details">
            <ActionItem text="Edit" ios.position="right" tap="edit" visibility="{{ controls.edit, controls.edit ? 'collapsed' : 'visible' }}"/>
            <ActionItem text="Save" ios.position="right" tap="save" visibility="{{ controls.edit, controls.edit ? 'visible' : 'collapsed' }}"/>
        </ActionBar>
    </Page.actionBar>

    <StackLayout>
        <GridLayout columns="*,*" rows="auto,auto">
            <Label text="First Name" col="0" row="0"/>
            <e:editable-text class="name" record="{{ user }}" fieldName="firstName" controls="{{ controls }}" col="1" row="0"/>

            <Label text="Last Name" col="0" row="1"/>
            <e:editable-text class="name" record="{{ user }}" fieldName="lastName" controls="{{ controls }}" col="1" row="1"/>
        </GridLayout>
    </StackLayout>
</Page>
```

#### Things of note:

* The `navigatingTo="onNavigatingTo"` attribute hooks up the component's built-in `onNavigatingTo()` initialization hook.

* The `xmlns:e="components/editable-text"` attribute defines a namespace "e" for our component so that it can be referenced in the XML as `<e:editable-text/>`.

* In the attribute `visibility="{{ controls.edit, controls.edit ? 'collapsed' : 'visible' }}"`, `controls.edit` is passed as the first argument to `{{ }}` in order to instruct NativeScript that the nested `edit` property is the source that should be observed for the expression following it, rather than the `controls` object in which it's contained. This requirement is documented in [NativeScript's Data Binding documentation](https://docs.nativescript.org/core-concepts/data-binding#using-expressions-for-bindings).

### details-page.js

For this example, let's assume that another page navigates to our `details-page` component by invoking `navigate()` like so:

```js
frames.topmost().navigate({
    moduleName: 'components/details-page/details-page',
    context: {
        user: new Observable({ firstName: 'Brendan', lastName: 'Eich' })
    }
});
```

The `details-page` component's JavaScript file would then look like so:

```js
import { Observable } from 'data/observable';
import Component from 'nativescript-component';

class DetailsPage extends Component {

    /**
    * Place initialization code in `init`, which is automatically called
    * after the parent is initialized and before child components are initialized.
    *
    * @override
    */
    init() {

        this.set('controls', new Observable({ edit: false }));
    }

    /**
    * Switches the UI from view mode to edit mode.
    */
    edit() {
        /** @todo: Check if `this.set('controls.edit', true)` correctly sets the nested proeprty and, if not, implement support for that. */
        let options = this.get('controls');
        options.set('edit', true);
    }

    /**
    * Switches the UI from edit mode to view mode.
    */
    save() {
        let options = this.get('controls');
        options.set('edit', false);
    }
}

DetailsPage.export(exports);
```

#### Things of note:

* The Component class has built-in initialization hooks (e.g. `onLoaded`, `onNavigatingFrom`, `onShownModally`, etc.), which implement its functionality. **At least one of these hooks must be connected to the template in order to setup the component.** Feel free to also extend these hooks, as was done with the `onNavigatingTo` hook here, but be sure to call the base class's implementation first.

* Once one of the `Component` class's initialization hooks is executed (e.g. `onNavigatingTo`), you can use its [built-in methods and properties](https://github.com/BinaryNate/nativescript-component/blob/master/docs/api.md) in your code. In `details-page`, `this.get()` and `this.set()` are used to get and set properties on the component's binding context. Properties set this way can be displayed in the component's template.

* The Component class's `onNavigatingTo` hook automatically took the `user` object that was passed to `navigate()` and bound it to the component's binding context, which means it's available in the JavaScript via `this.get('user')` and available to the XML template as `{{ user }}`.

* Call the `export()` method to export the class in the format that the NativeScript runtime expects. It also sets up the code that allows multiple instances of the component to coexist.

### editable-text.xml

The `editable-text` component can be switched from "view" mode to "edit" mode and vice versa by its parent component (`details-page`), so its template has a read-only `<Label/>` that is shown in "view" mode and an editable `<TextField/>` that is shown in "edit" mode.

```xml
<StackLayout loaded="onLoaded">
    <Label id="label" visibility="{{ controls.edit, controls.edit ? 'collapsed' : 'visible' }}"/>
    <TextField id="input" visibility="{{ controls.edit, controls.edit ? 'visible' : 'collapsed' }}"/>
</StackLayout>
```

### editable-text.js

The `editable-text` component accepts three parameters from its parent component:
* `record` - A data record object that contains a property that we want to view and edit
* `fieldName` - The name of the property in the `record` object we want to view and edit
* `controls` - An object with properties that allow the parent component to dynamically control the child. In this example, we just use a single `controls.edit` property to indicate whether the text field is in edit mode.

```js
import Component from 'nativescript-component';

class EditableText extends Component {

    /**
    * @override
    */
    init() {

        // Set up the two-way binding for the data record's specified property.
        // This must be done in JavaScript, because NativeScript's XML binding expressions don't currently support dynamic
        // property names.
        let label = this.view.getViewById('label'),
            input = this.view.getViewById('input'),
            record = this.get('record'),
            fieldName = this.get('fieldName');

        label.bind({
            sourceProperty: fieldName,
            targetProperty: 'text',
            twoWay: true
        }, record);

        input.bind({
            sourceProperty: fieldName,
            targetProperty: 'text',
            twoWay: true
        }, record);
    }
}

EditableText.export(exports);
```

#### Things of note:

* The `Component` class's initialization hooks (e.g. `onLoaded`) automatically detect parameters passed as XML attributes and sets them as properties on the component's binding context, so our parameters in this example are accessible using `this.get()`.

* This file shows how the component's view is accessible as `this.view`.

* Normally it's not necessary to set up bindings manually as shown here in `onLoaded`, but it's needed in this case in order to allow the `fieldName` property to dynamically specify the name of the property we're interested in.

**For more information, check out the [API docs](https://github.com/BinaryNate/nativescript-component/blob/master/docs/api.md).**

## Contributing

Find an issue or have an idea for a feature? Feel free to submit a PR or open an issue.

### Building

This module is implemented in ES 6 and transpiled to ES 5 for export. To build the source:

```
npm run build
```

There's also a git pre-commit hook that automatically builds upon commit, since the dist directory is committed.

### Linting

```
npm run lint
```
