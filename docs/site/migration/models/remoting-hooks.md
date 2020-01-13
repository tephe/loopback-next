---
lang: en
title: 'Migrating remoting hooks'
keywords: LoopBack 4.0, LoopBack 4, LoopBack 3, Migration
sidebar: lb4_sidebar
permalink: /doc/en/lb4/migration-models-remoting-hooks.html
---

## Introduction

In LoopBack 3, a [Remote hook](https://loopback.io/doc/en/lb3/Remote-hooks.html)
enables you to execute a function before or after a remote method is called by a
client:

- `beforeRemote()` runs before the remote method.
- `afterRemote()` runs after the remote method has finished successfully.
- `afterRemoteError()` runs after the remote method has finished with an error.

Hooks can be configured to run for one or more methods using a wildcard
specifier. In general, there are three kinds of hook scopes:

- **Global hooks** are executed for _every_ remote method.

  These hooks are registered on the application object using a `**` wildcard.
  For example:

  ```js
  app.beforeRemote('**', handlerFn);
  ```

- **Model-level hooks** are executed for every remote method of a given model
  class.

  These hooks are typically registered on the application object using
  `{model-name}.**` wildcard. For example, to run a hook for all methods of the
  `User` model:

  ```js
  app.beforeRemote('User.**', handlerFn);
  ```

- **Method-level hooks** are executed only for a single method of a given model
  class.

  These hooks are typically registered on the model class. For example, to run a
  hook whenever `User.login` is called remotely:

  ```js
  User.beforeRemote('User.login', handlerFn);
  ```

LoopBack 4 provides [Interceptors](../../Interceptors.md) feature to enable
application developers to implement similar functionality. In the following
sections, we will first explain how to rewrite hook implementations to
interceptors and then show how to register interceptors to be invoked globally,
at a class level or at a method level.

## Migrating a hook to an interceptor

Let's take a look at a typical interceptor implementation:

```ts
async function intercept(
  invocationCtx: InvocationContext,
  next: () => ValueOrPromise<InvocationResult>,
) {
  try {
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  } catch (err) {
    // Add error handling logic here
    throw err;
  }
}
```

Every interceptor contains three parts, each corresponding to one of the
remoting hooks:

- Code from a `beforeRemote` hook belongs to the first section that's executed
  before the target method is invoked.
- Code from an `afterRemote` hook belongs to the second section.
- Code from an `afterRemoteError` hook belongs to the third section inside the
  `catch` block.

{% include tip.html content=" In LoopBack 3, hooks can be written in one of the
following three styles:

- A function accepting a callback as the last argument.
- A function returning a promise, often using
  [Bluebird](http://bluebirdjs.com/docs/getting-started.html) APIs.
- An async function using `await` statements for asynchronous flow control.

In LoopBack 4, interceptors are written as async functions using `await`
statements. "%}

### Example

Consider the following set of remote hooks implementing a very simple request
logger. We are registering the hooks as global to keep this example simple, but
the same approach works for model-level and method-level hooks too.

```js
app.beforeRemote('**', function logBefore(ctx, next) {
  console.log('About to invoke a method.');
  next();
});

app.afterRemote('**', function logAfter(ctx, next) {
  console.log('Method finished.');
  next();
});

app.afterRemoteError('**', function logAfterError(ctx, next) {
  console.log('Method failed: ', ctx.error);
});
```

These three hooks can be converted into a single interceptor.

```ts
try {
  // Add pre-invocation logic here
  console.log('About to invoke a method.');
  const result = await next();
  // Add post-invocation logic here
  console.log('Method finished.');
  return result;
} catch (err) {
  // Add error handling logic here
  console.log('Method failed: ', err);
  throw err;
}
```

## Migrating global hooks

Global remoting hooks should be rewritten to
[global interceptors](https://loopback.io/doc/en/lb4/Interceptors.html#global-interceptors).
You can use [Interceptor generator CLI](../../ Interceptor-generator.md) to
create the necessary infrastructure for each hook.

First, run `lb4 interceptor` to create a new interceptor. Pick an interceptor
name (e.g. `GlobalLogger`) and make sure to ask the generator to scaffold a
global interceptor. You can pick an empty interceptor group (`''`) when
prompted.

```
$ lb4 interceptor
? Interceptor name: GlobalLogger
? Is it a global interceptor? Yes

Global interceptors are sorted by the order of an array of group names bound to ContextBindings.GLOBAL_INTERCEPTOR_ORDERED_GROUPS. See https://loopback.io/doc/en/lb4/Interceptors.html#order-of-invocation-for-interceptors.

? Group name for the global interceptor: ('')
  create src/interceptors/global-logger.interceptor.ts
  update src/interceptors/index.ts

Interceptor GlobalLogger was created in src/interceptors/
```

Next, open the generated interceptor file and replace the default implementation
of `intercept` method with the code adopted from your original LoopBack 3 hooks.

See XXX for instructions on how to map LoopBack 3 context properties to
LoopBack 4.

## Migrating model-level hooks

Model-level hooks should be rewritten to
[class interceptors](https://loopback.io/doc/en/lb4/Interceptors.html#class-level-interceptors).
You can use [Interceptor generator CLI](../../ Interceptor-generator.md) to
create the necessary infrastructure for each hook.

First, run `lb4 interceptor` to create a new interceptor. Pick an interceptor
name (e.g. `ProductLogger`) and make sure to ask the generator to scaffold a
non-global interceptor.

```
$ lb4 interceptor
? Interceptor name: ProductLogger
? Is it a global interceptor? No
   create src/interceptors/product-logger.interceptor.ts
   update src/interceptors/index.ts

Interceptor Product was created in src/interceptors/
```

Next, open the generated interceptor file and replace the default implementation
of `intercept` method with the code adopted from your original LoopBack 3 hooks.

Finally, register the new interceptor to be invoked for all methods of the
target controller class.

For example:

```ts
import {inject, intercept} from '@loopback/core';
// ...

@intercept(ProductLoggerInterceptor.BINDING_KEY)
export class ProductController {
  // ...
}
```

## Migrating method-level hooks

Method-level hooks should be rewritten to
[method interceptors](https://loopback.io/doc/en/lb4/Interceptors.html#method-level-interceptors).
You can use [Interceptor generator CLI](../../ Interceptor-generator.md) to
create the necessary infrastructure for each hook.

First, run `lb4 interceptor` to create a new interceptor. Pick an interceptor
name (e.g. `CreationLogger`) and make sure to ask the generator to scaffold a
non-global interceptor.

```
$ lb4 interceptor
? Interceptor name: CreationLogger
? Is it a global interceptor? No
   create src/interceptors/creation-logger.interceptor.ts
   update src/interceptors/index.ts

Interceptor CreationLogger was created in src/interceptors/
```

Next, open the generated interceptor file and replace the default implementation
of `intercept` method with the code adopted from your original LoopBack 3 hooks.

Finally, register the new interceptor to be invoked for the selected methods of
the target controller class.

For example:

```ts
import {inject, intercept} from '@loopback/core';
// ...

export class ProductController {
  // ...

  @intercept(CreationLoggerInterceptor.BINDING_KEY)
  @post('/todos', {
    responses: {
      '200': {
        description: 'Todo model instance',
        content: {'application/json': {schema: getModelSchemaRef(Todo)}},
      },
    },
  })
  async create(): // ...
  Promise<Product> {
    // ...
  }
}
```

## Accessing context data

(to be done)

## Modifying request parameters

(to be done)

## Modifying the response

(to be done)
