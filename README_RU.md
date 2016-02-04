# Angularfire Multi Auth

[![Bower version](https://badge.fury.io/bo/angularfire-multi-auth.svg)](http://badge.fury.io/bo/angularfire-multi-auth)

## Проблема
Если вы хотите использовать функцию Signup/Login, которую [Firebase](https://firebase.com) имеет из коробки
(ранее Simple Login) вы можете столкнуться с одной проблемой: **как обрабатывать множественный логин для одного пользователя?**


## Решение

Из [вопроса на Stack Overflow](http://stackoverflow.com/questions/15148089/how-can-i-login-with-multiple-social-services-with-firebase),
 Andrew Lee дал нам подсказку как приспособить it creating некоторую структуру внутри Firebase для управления процессом. И это очень хорошая идея. Единственная проблема заключается в беспорядок который вам придётся сделать в коде, чтобы достигнуть этого.

Итак, по этой причине, я создал **angularfire-multi-auth**

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

## Как это работает?
Для каждого новго пользователья создаваемого `$createUser` или первый раз использовавшего `$authWithOAuthPopup` мы создаём следующие записи в Firebase:

```
|-authGroup
|-----[authGroupId]
|-----------[user.provider]:[user.uid]
|-userMapping
|-----[user.uid]:[authGroupId]
```

Когда вы вызываете `$associatePassword` мы создаем другой Email/Password связывая его с зарегистрированным пользователя как:

```
|-authGroup
|-----[authGroupId]
|-----------[user.provider]:[user.uid]
|-----------[NEWuser.provider]:[NEWuser.uid]  <<<<<<<
|-userMapping
|-----[user.uid]:[authGroupId]
```


Мы делаем то же самое, когда вы используете `$associateSocial`, но в этом случае нам нужно немного помощи константы `FBURL_ALTERNATE` 
потому что мы не можем вызвать `$authWithPopup` для авторизованного пользователя,поэтому мы будем использовать альтернативный Firebase URL
(вы можете использовать свободно, потому что это она будет использоваться только в тот момент, когда пользователь связывается с текущей)

Также мы добавляем свойство `authGroup` для `user` возвращаемого `$getAuth` это сделает вещи легче при установлении прав на данные Firebase.


## Security Usage
Now you should protect entities based on `authGroup` instead of the uid. To do that you only need to use the following
security rule to grab the 'authGroup' of the logged user on Security rules:

```
root.child('userMapping').child(auth.uid).val()
```

## Project Status

I started it alone, but we are already 3 awesome people building this library:

[@douglascorrea](https://github.com/douglascorrea)

[@luanven](https://github.com/luanven)

[@gilhanan](https://github.com/gilhanan)

BUT we still really really want and appreciate your help. Let's do this a "many awesome contributors show".

Please go ahead open issues, create PRs and help me build this useful library.

If you want you can ping me on twitter [@douglas_correa](http://twitter.com/douglas_correa)
