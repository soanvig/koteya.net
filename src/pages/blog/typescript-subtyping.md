## TypeScript subtyping problem

{{toc}}

JavaScript is by far my favorite programming language. I even have work-in-progress blogpost about why I adore it.
However, I also love strictly typed languages (or actually hate dynamically typed ones), thus I use TypeScript.

And I have a problem.

{{h3|problem|The problem}}

<small class="disclaimer">
  In this blogpost I'll use words "type" and "object" interchangebly, as sometimes word *type* might be too general.
  <br><br>
  Also the example that I'm going to use is based on a real-world scenario.
</small>

Let's say I have a type (an object) named `RegisterCompanyUserProcess`. Its role is to guide a user through a long and boring account registration process, that additionaly can be paused at any moment, and returned back later on in time.

The underlying implementation (struct, function, class, plain object, whatnot)
depends on the language itself and is beyond scope of that blogpost.
But let's assume it is a class: 

```ts
class RegisterCompanyUserProcess {}
```

<small class="disclaimer">
  Classes are extremely useful in TypeScript, because they are both a runtime value, and a type (albeit structurally - not nominally - typed).
</small>

Now at this very moment we can't tell anything about that type, because it doesn't do anything. Let's add some functions:

```ts
// I'm avoiding implementation details as this blogpost is about the types, not about the runtime code
class RegisterCompanyUserProcess {
  public getUserName(): string {}
  public getEmail(): string {}
  public getCompanyId(): string {}
  public setUserDetails(details: UserDetails): void {}
}
```

As long as we are using `RegisterCompanyUserProcess` directly, we know the interface of that class, and can use it directly: `registerCompanyUserProcess.getUserName()` etc.

What if we introduce another class? Previously we had a process for registering company users. What if we want to register administrator users, that have similar process, with some differences:

```ts
class RegisterAdminUserProcess {
  public getUserName(): string {}
  public getEmail(): string {}
  public setUserDetails(details: UserDetails): void {}
}
```

At this point, we might want to have a general system of handling registration form, that simply "sets user details" no matter of the process we are working on.

And here the problem starts...

{{h3|explicit-types|Explicitly defining types}}

```ts
const generalSetUserDetails = (process: RegisterCompanyUserProcess | RegisterAdminUserProcess, details: UserDetails) => {
  process.setUserDetails(details);
}
```

Explicitly definining types is fine for a while. If we had 10 processes, then it would start to scale bad and is not flexible:

- First of all, we have a list of specific processes in **general** registration form function;
- Secondly, that list has to be maintained;
- Thirdly, by looking at the individual process implementation we don't know that it is a part of some general (registration form) contract;
- Lastly, if we are creating some sort of a library, we cannot "inject" more processes into the `generalSetUserDetails` type. 

If we decide that any of these issues is a real problem to us, we might want to investigate other solutions.

{{h3|interface|Interface}}

Interfaces are a way to set given constraints on a type:

```ts
interface HasUserDetails {
  setUserDetails(details: UserDetails): void;
}

class RegisterCompanyUserProcess implements HasUserDetails {
  ...
  // required to implement because of interface
  setUserDetails(details: UserDetails): void;
}

class RegisterAdminUserProcess implements HasUserDetails {
  ...
  // required to implement because of interface
  setUserDetails(details: UserDetails): void;
}

const generalSetUserDetails = (process: HasUserDetails, details: UserDetails) => {
  process.setUserDetails(details);
}
```

We defined an interface, and made our classes implement that interface. Because TypeScript is structurally typed (it doesn't care about specific types) we could omit `implements HasUserDetails`, and the `generalSetUserDetails` would still accept instances of both our classes, but then we would lose constraint, IDE suggestions, and mental model of a class. So it's definitely good to put the constaint explicitly.

With one simple change we fixed all our problems from the previous solution, so we can finish the job.

Well, usually yes. However that solution doesn't solve all the problems that we might encounter.
Let's say that we have those 2 processes plus number of processes of totally different type. And we want to list names of the processes that are about "setting user details" (because for example we want to check if user is already a member of some "register" process, and implementing `HasUserDetails` uniquely identifies such process):

```ts
const processConstructors = [
  RegisterCompanyUserProcess,
  RegisterAdminUserProcess,
  PlaceOrderProcess,
  PaymentProcess,
];
```

What choices do we have?

{{h3|check-implementation|Check implementation directly}}

Because we know we are looking for `HasUserDetails`, and that it implements `setUserDetails` we might check if such property is available in the constructor:

```ts
const isUserDetailsProcess = (processCtor: Ctor<unknown>): processCtor is Ctor<HasUserDetails> => {
  return 'setUserDetails' in processCtor;
};

const userDetailsProcesses = processConstructors.filter(isUserDetailsProcess);
```

So far so good. But what if accidentaly there is a process with `setUserDetails`, but is not a type of a process we are looking for? We moved structural typing idea into runtime.

We don't know ([at least by default](https://github.com/woutervh-/typescript-is)) which interface was used for our class. For that reason, we need to add some "runtime unique" way to identify process type. We can for example say, that interface requires a field, that will almost never clash accidentaly, and check that name:

```ts
interface HasUserDetails {
  setUserDetails(details: UserDetails): void;
  __hasUserDetailInterface: boolean;
}

class RegisterCompanyUserProcess implements HasUserDetails {
  __hasUserDetailInterface = true;
  setUserDetails(details: UserDetails): void;
}
```

But that's ugly as hell, as we would have to add this strange field to every class that implements `HasUserDetails`, and we cannot check constructor anymore, because that field gets initiated together with an instance of a class.

{{h3|runtime-descriptor|Runtime descriptor}}

{{h4|static-property|Static property}}

We can add some sort of a category to our process class:

```ts
class RegisterCompanyUserProcess implements HasUserDetails {
  public static category = ProcessCategory.HasUserDetails;
}

class PlaceOrderProcess implements CartProcess {
  public static category = ProcessCategory.CartProcess;
}

const isUserDetailsProcess = (processCtor: Ctor<unknown> & { category: ProcessCategory }): processCtor is Ctor<HasUserDetails> => {
  return ctor.category === ProcessCategory.HasUserDetails;
};
```

But that creates a centralized store of types (`ProcessCategory`) which is not very extensible (remember library case?),
and it is not connected to `HasUserDetails` interface. Some might set `ProcessCategory.CartProcess` on `RegisterCompanyUserProcess`.
There is no way to connect static property with interface, because class interface describes **instance of a class**, and static property describes **constructor of a class**.

{{h4|instance-property|Instance property}}

We could move category to interface:

```ts
interface HasUserDetails {
  setUserDetails(details: UserDetails): void;
  category: ProcessCategory.HasUserDetails;
}

class RegisterCompanyUserProcess implements HasUserDetails {
  ...
  setUserDetails(details: UserDetails): void;
  category = ProcessCategory.HasUserDetails;
}

const isUserDetailsProcessInstance = (processInstance: { category: ProcessCategory }): processInstance is HasUserDetails => {
  return processInstance.category === ProcessCategory.HasUserDetails;
};

const isUserDetailsProcessCtor = (processCtor: Ctor<{ category: ProcessCategory }>): processCtor is Ctor<HasUserDetails> => {
  throw new Error('Impossible to implement');
};
```

But that's impossible to implement for process constructor, because the instance field `category` is not set yet. Thus we are limiting checking process type to checking instances only.

{{h4|inheritance|Inheritance}}

We could make `HasUserDetails` an abstract class. That way we can define required type, and at the same time provide a runtime value that can be checked both in a constructor and instance:

```ts
abstract class HasUserDetails {
  // By setting abstract on that property we require implementing it by child class
  abstract setUserDetails(details: UserDetails): void;
  // But category field is hardcoded in parent class
  // static fields from parent class are available in child classes
  static category = ProcessCategory.HasUserDetails;
}

class RegisterCompanyUserProcess extends HasUserDetails {
  // Have to implement `setUserDetails`
  setUserDetails(details: UserDetails): void;
}

const isUserDetailsProcessInstance = (processInstance: object): processInstance is HasUserDetails => {
  return processInstance instanceof HasUserDetails;
};

const isUserDetailsProcessCtor = (processCtor: Ctor<{ category: ProcessCategory }>): processCtor is Ctor<HasUserDetails> => {
  return processCtor.category === ProcessCategory.HasUserDetails;
};
```

That works almost perfectly, except for one problem: JavaScript doesn't allow to extend multiple classes. Thus if we want to bake-in multiple behaviors into process (not only one `HasUserDetails` but also for example `IsSendingEmail` or whatever), then it is impossible.

Also, if we want to create a `constructor` in child class, we would have to explictly make call to `super()` (although TypeScript will remind us about it).

{{h4|instance-constructor-decorator|Instance and constructor decorator}}

We could set some value on constructor, and ensure typing at the same time, using a decorator:

```ts
abstract class HasUserDetails { // both runtime and typing
  setUserDetails(details: UserDetails): void;
}

// legacy (not TC-39) decorator syntax
const ProcessType = <T>(type: Ctor<T>) => (ctor: Ctor<T>) => {
  const processCtorMetadata: ProcessTypeMetadata = Reflect.getMetadata(PROCESS_TYPE_SYMBOL, ctor) ?? { types: [] };

  metadata.types.push(type);

  Reflect.defineMetadata(PROCESS_TYPE_SYMBOL, metadata, ctor);
};

@ProcessType(HasUserDetails) // since TS5.0 decorators have ability to check type of decorated values
class RegisterCompanyUserProcess {
  // Have to implement `setUserDetails`
  setUserDetails(details: UserDetails): void;
}

const isProcessInstance = (processInstance: unknown, type: Ctor<T>): processInstance is HasUserDetails => {
  return getProcessTypeMetadata(processInstance.constructor).includes(type);
};

const isProcessCtor = (processCtor: Ctor<unknown>, type: Ctor<T>): processCtor is Ctor<HasUserDetails> => {
  return getProcessTypeMetadata(processCtor).includes(type);
};
```

Note how we don't have to set any value on a prototype, because from instance we can always access constructor and its metadata.
Also, I also generalized function for checking process type.

Now, that solution is almost perfect. It however reduces *DX* (developer experience). That's because:

1. whenever we update our `HasUserDetails` interface (abstract class), although we get an error, the error is not on the class, but on the decorator usage.
2. due to error in "wrong" place, there is no intellisense between a required implementation, and decorated type. No suggestions, no auto-complete, nothing.

We can solve these issues by setting the decorator `@ProcessType` (which is required for functionality to work), and using `implements` for DX:

```ts
@ProcessType(HasUserDetails)
class RegisterCompanyUserProcess implements HasUserDetails {
  ...
}
```

...and have a complete solution for our required functionality, without sacrificing DX *that much*
(we still sacrifice it slightly by putting a soft requirement of defining type in two places: decorator and `implements`).

{{h3|summary|Summary}}

Described problem and solutions is something I went through in not one but few of my projects. Whenever I wanted to generalize *behavior* I needed
proper typing, and runtime checks. Because **by default** ([see TS transformers](https://github.com/woutervh-/typescript-is))
TypeScript doesn't put any useful metadata from its compilation step into runtime (well, [it does put `design` metadata in some places](https://www.typescriptlang.org/docs/handbook/decorators.html#metadata), but nothing useful to us).
I had to implement one of solutions described above.

That means, that this is a broader problem of TypeScript typing.

Firstly, it lacks connection between types and runtime - to do anything useful on "type level" you have to hack it by yourself (again: see TS transformers).

Secondly, besides limited `extends` (which is JavaScript's syntax) it doesn't have any way of subtyping that is usable in runtime.

{{h3|how-it-could-be-done|How it could be done}}

But everything I described above could be done!
TypeScript could emit more design metadata (for example list of implemented interface).
It could have even better class decorator support (to avoid need for `implements` together with decorator).
Lastly, it could have nominal typing. With that we could avoid all that hassle, and finish on simple [Interface](#interface).
Nominal typing would be useful in other places as well ([Branded types](https://www.learningtypescript.com/articles/branded-types) not longer needed), alas would cause multiple problems as well.

I find Haskell and Rust having interesting approach to nominal typing and polymorphism (using type classes and traits respectively).
There, we create a type class (Haskell) or trait (Rust). Then we make our "class" (type in Haskell, struct in Rust) "implement" that type class/trait:

```rs
// Rust implementation. In Haskell it is structurally very similar
trait HasUserDetails {
  fn setUserDetails(&mut self, details: UserDetails) -> ();
}

struct RegisterCompanyUserProcess {}

impl HasUserDetails for RegisterCompanyUserProcess {
  fn setUserDetails(&mut self, details: UserDetails) -> () {
    // ...
  }
}
```

Now the `RegisterCompanyUserProcess` has to have implementation of `HasUserDetails`. **Explicitly** `HasUserDetails`.
Even if other struct defines exactly the same functions as `HasUserDetails` it won't be accepted as a parameter to a function that expects something implementing `HasUserDetails`.

Secondly, we have a very clean implementation: not everything is mixed together in one object, but there is a definition and implementation in one place.
That means, that we can easily add/remove traits (just by adding and removing solid chunks of code), and it is way easier to organize the code (trait implementation can even be in a different file!).

As a bonus, both Haskell and Rust are designed to work around traits.
You cannot pass your struct (TypeScript class) to `.sort()` or `===` unless they meet `Ord` (Order) or `Eq` (Equal) typeclass/trait.
This leads to much, much safer code (no more errors of comparing things that shouldn't be compared, like `if(booleanWrapperClassInstance)` that is always true for JS runtime, and there is no way to circumvent that syntax), and to have cleaner business logic.
You also define explicit **behavior** of your objects: `impl Eq<boolean> for BooleanWrapper` -> and now you struct can be safely compared to boolean without any additional code (operator `===` in `booleanWrapperInstance === true` will call the trait for you)

I love TypeScript, but it is definitely lacking in some areas.






