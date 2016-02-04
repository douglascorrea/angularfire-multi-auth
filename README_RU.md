# Angularfire Multi Auth

[![Bower version](https://badge.fury.io/bo/angularfire-multi-auth.svg)](http://badge.fury.io/bo/angularfire-multi-auth)

## Проблема
Если вы хотите использовать функцию Signup/Login, которую [Firebase](https://firebase.com) имеет из коробки
(ранее Simple Login) вы можете столкнуться с одной проблемой: **как обрабатывать множественный логин для одного пользователя?**


## Решение

Из [вопроса на Stack Overflow](http://stackoverflow.com/questions/15148089/how-can-i-login-with-multiple-social-services-with-firebase),
 Andrew Lee дал нам подсказку как приспособить it creating некоторую структуру внутри Firebase для управления процессом. И это очень хорошая идея. Единственная проблема заключается в беспорядок который вам придётся сделать в коде, чтобы достигнуть этого.

Итак, по этой причине, я создал **angularfire-multi-auth**

## Что такое angularfire-multi-auth?

Это декоратор фабрики для $firebaseAuth который абстрагируется от сложности создания структуры необходимой для использования множественного логина для одного пользователя.

## Как устанавливать?

Вам необходимо установить и добавить его в файл index.html

```
bower install angularfire-multi-auth --save
```

Уствновите основные правила безопасности содержащиеся в файле securityRules.json

И создайте константу Angular с именем `FBURL_ALTERNATE` которая содержит альтернативный Firebase URL для использования функции `associateSocial`.

И используйте Angularfire обычным способом.

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
Теперь вы должны защищать объекты, основанные на `authGroup` вместо uid. Для этого вам нужно всего лишь использовать следующее правило безопасности, чтобы отследить 'authGroup' вошедшего пользователя о правилах безопасности:

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
