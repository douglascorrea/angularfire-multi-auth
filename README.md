# Angularfire Multi Auth

## The problem
If you wanna use the Signup/Login feature that [Firebase](https://firebase.com) brings out of the box
(formely Simple Login) you may face one problem: **How to handle multiple login provides for the same user?**


## The solution

From this [question on Stack Overflow](http://stackoverflow.com/questions/15148089/how-can-i-login-with-multiple-social-services-with-firebase),
 Andrew Lee give us a suggestion to accommodate it creating some structure inside Firebase to handle the process. And it
  is a very good idea. The only problem is the mess you should made on your code to accomplish that.

So, this is the reason I've created **angularfire-multi-auth**

## What is angularfire-multi-auth?

It's a factory decorator for $firebaseAuth that abstract the complexity of creating the structure needed for use multiple
login providers for the same user.

## How to install it?

You need to install it and add it on your index.html file:

```
bower install angularfire-multi-auth --save
```

Install the basic security rule contained on file securityRules.json

And create an Angular Constant calle `FBURL_ALTERNATE` that should contain the alternative Firebase URL for being used
on `associateSocial` feature.

And you will use Angularfire normally.

## How it works?
For every new user created via `$createUser` or the first time you use `$authWithOAuthPopup` we will create the following entries on Firebase:

```
|-authGroup
|-----[authGroupId]
|-----------[user.provider]:[user.uid]
|-userMapping
|-----[user.uid]:[authGroupId]
```

When you call `$associatePassword` we will create another Email/Password associating it to the logged user like:

```
|-authGroup
|-----[authGroupId]
|-----------[user.provider]:[user.uid]
|-----------[NEWuser.provider]:[NEWuser.uid]  <<<<<<<
|-userMapping
|-----[user.uid]:[authGroupId]
```


We do the same when you use `$associateSocial`, but for this case we need a little help of `FBURL_ALTERNATE` constant
because we can't call `$authWithPopup` with a logged user, so we will user an alternative Firebase URL
(you can use a free one because it will just be used on exact moment the user is being associated to the current one)

And we also added a `authGroup` property for the `user` returned by `$getAuth` it will make things easier when setting ownership
on Firebase data.


## Security Usage
Now you should protect entities based on `authGroup` instead of the uid. To do that you only need to use the following
security rule to grab the 'authGroup' of the logged user on Security rules:

```
oot.child('userMapping').child(auth.uid).val()
```

## Project Status

Besides I use "we" on every part of this README, it is a "only man show", so it is far to be the library I think it could be.

BUT I really really want and appreciate your help. Let's do this a "many awesome contributors show".

Please go ahead open issues, create PRs and help me build this useful library.

If you want you can ping me on twitter [@douglas_correa](http://twitter.com/douglas_correa)