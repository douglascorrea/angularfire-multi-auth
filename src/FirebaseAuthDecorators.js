'use strict';
angular.module('angularfire-multi-auth')
    .config(['$provide', function ($provide) {
        $provide.decorator('$firebaseAuth', ['$delegate', '$q', '$window', 'FBURL_ALTERNATE',  function ($delegate, $q, $window, FBURL_ALTERNATE) {
            var construct = $delegate;

            $delegate = function (ref) {

                /*
                 Function used to remove root domain from Firebase ref
                 */

                function extractDomain(url) {
                    var domain;
                    if (url.indexOf("://") > -1) {
                        domain = url.split('/')[2];
                    }
                    else {
                        domain = url.split('/')[0];
                    }
                    domain = domain.split(':')[0];
                    return domain;
                }

                function extractEnviroment(domain) {
                    return domain.split('.firebaseio.com')[0];
                }


                /*
                 Storing the original methods to be called later
                 */
                var auth = construct(ref);
                var $createUser = auth.$createUser;
                var $removeUser = auth.$removeUser;

                var $authWithPassword = auth.$authWithPassword;
                var $authWithOAuthPopup = auth.$authWithOAuthPopup;


                /*
                 This method is being decorated to create the mapping for the user that is being created.
                 We don' need to make a query first because we can't create duplicated users (with email/password)
                 Firebase take care of it on email/password.
                 */
                auth.$createUser = function (credentials) {
                    var deferred = $q.defer();
                    $createUser(credentials)
                        .then(function (userData) {
                            $authWithPassword(credentials)
                                .then(function (user) {
                                    var authGroupRef = new Firebase(ref.root() + '/authGroup');
                                    var authGroupRec = {};
                                    authGroupRec[user.provider] = user.uid;
                                    var authGroup = authGroupRef.push(authGroupRec, function () {
                                        var userMappingRef = new Firebase(ref.root() + '/userMapping');
                                        var userMappingRec = {};
                                        userMappingRec[user.uid] = authGroup.key();
                                        userMappingRef.update(userMappingRec, function () {
                                            auth.$unauth();
                                            deferred.resolve(userData);
                                        });
                                    });
                                })
                                .catch(function (err) {
                                    deferred.reject((err));
                                });
                        })
                        .catch(function (err) {
                            deferred.reject(err);
                        });
                    return deferred.promise;
                };

                /*
                 This method is being decorated to remove the mapping for the user that is being removed.
                 */
                auth.$removeUser = function (credentials) {
                    var deferred = $q.defer();
                    $authWithPassword(credentials)
                        .then(function (user) {
                            var authGroupRef = new Firebase(ref.root() + '/authGroup');
                            authGroupRef.orderByChild(user.provider).equalTo(user.uid).on("child_added", function (snapshot) {
                                snapshot.ref().remove(function (err) {
                                    if (!err) {
                                        auth.$unauth();
                                        $removeUser(credentials)
                                            .then(function () {
                                                deferred.resolve();
                                            })
                                            .catch(function (err) {
                                                deferred.reject(err);
                                            });

                                    } else {
                                        deferred.reject(err);
                                    }
                                });
                            });
                        })
                        .catch(function (err) {
                            deferred.reject(err);
                        });

                    return deferred.promise;
                };


                /*
                 This method is being decorated to get the authGroup associated to the user that is logging in.
                 */
                auth.$authWithPassword = function (credentials, options) {
                    var deferred = $q.defer();
                    $authWithPassword(credentials, options)
                        .then(function (user) {
                            var domain = extractEnviroment(extractDomain(ref.root().toString()));
                            var currentSession = JSON.parse($window.localStorage.getItem('firebase:session::' + domain));
                            var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
                            userMappingRef.on("value", function (snapshot) {
                                currentSession.authGroup = snapshot.val();
                                user.authGroup = snapshot.val();
                                $window.localStorage.setItem('firebase:session::' + domain, JSON.stringify(currentSession));
                                deferred.resolve(user);
                            });


                        })
                        .catch(function (err) {
                            deferred.reject(err);
                        });
                    return deferred.promise;
                };

                /*
                 This method is being decorated to get the authGroup associated to the user that is logging in via social accounts.
                 */
                auth.$authWithOAuthPopup = function (provider, options) {
                    var deferred = $q.defer();
                    $authWithOAuthPopup(provider, options)
                        .then(function (user) {
                            var domain = extractEnviroment(extractDomain(ref.root().toString()));
                            var currentSession = JSON.parse($window.localStorage.getItem('firebase:session::' + domain));
                            var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
                            userMappingRef.once("value", function (snapshot) {
                                var exists = (snapshot.val() !== null);
                                if (exists) {
                                    currentSession.authGroup = snapshot.val();
                                    user.authGroup = snapshot.val();
                                    $window.localStorage.setItem('firebase:session::' + domain, JSON.stringify(currentSession));
                                    deferred.resolve(user);
                                } else {
                                    var authGroupRef = new Firebase(ref.root() + '/authGroup');
                                    var authGroupRec = {};
                                    authGroupRec[user.provider] = user.uid;
                                    var authGroup = authGroupRef.push(authGroupRec, function () {
                                        var userMappingRef = new Firebase(ref.root() + '/userMapping');
                                        var userMappingRec = {};
                                        userMappingRec[user.uid] = authGroup.key();
                                        userMappingRef.update(userMappingRec, function () {
                                            currentSession.authGroup = authGroup.key();
                                            user.authGroup = authGroup.key();
                                            $window.localStorage.setItem('firebase:session::' + domain, JSON.stringify(currentSession));
                                            deferred.resolve(user);
                                        });
                                    });
                                }

                            });


                        })
                        .catch(function (err) {
                            deferred.reject(err);
                        });
                    return deferred.promise;
                };

                /*
                 This method will be used to associate a social account to the current logged user
                 */
                auth.$associateSocial = function (provider, options) {
                    var deferred = $q.defer();
                    var newRef = new Firebase(FBURL_ALTERNATE);
                    var newAuth = $delegate(newRef);
                    var currentUser = auth.$getAuth();

                    var authGroupRef = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
                    authGroupRef.orderByKey().equalTo(provider).once("value", function (snapshot) {
                        if (provider === currentUser.provider || snapshot.val() !== null) {
                            deferred.reject('You already is using an ' + provider + ' account.');
                        } else {
                            newAuth.$authWithOAuthPopup(provider, options)
                                .then(function (user) {
                                    var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
                                    userMappingRef.once("value", function (snapshot) {
                                        var exists = (snapshot.val() !== null);
                                        if (exists) {
                                            deferred.reject('User is already associated to another account');
                                        } else {
                                            var authGroupRefNew = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
                                            var authGroupRec = {};
                                            authGroupRec[user.provider] = user.uid;
                                            authGroupRefNew.update(authGroupRec, function () {
                                                var userMappingRef = new Firebase(ref.root() + '/userMapping');
                                                var userMappingRec = {};
                                                userMappingRec[user.uid] = currentUser.authGroup;
                                                userMappingRef.update(userMappingRec, function () {
                                                    newAuth.$unauth();
                                                    deferred.resolve(user);
                                                });
                                            });
                                        }

                                    });

                                })
                                .catch(function (err) {
                                    deferred.reject(err);
                                });
                        }
                    });

                    return deferred.promise;
                };

                /*
                 This method will be used to disassociate a social account to the current logged user
                 */
                auth.$disassociateSocial = function (uid, provider) {
                    var deferred = $q.defer();
                    var currentUser = auth.$getAuth();
                    if (uid === currentUser.uid) {
                        deferred.reject('The user you want to disassociate is the logged user, please logoff and login with another user');
                    } else {
                        var userMappingRef = new Firebase(ref.root() + '/userMapping/' + uid);
                        userMappingRef.remove(function (err) {
                            if (err) {
                                deferred.reject(err);
                            } else {
                                var authGroupRef = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup + '/' + provider);
                                authGroupRef.remove(function (err) {
                                    if (err) {
                                        deferred.reject(err);
                                    } else {
                                        deferred.resolve();
                                    }
                                });
                            }
                        });
                    }
                    return deferred.promise;
                };

                /*
                 This method will be used to associate a email/password account to the current logged user
                 */
                auth.$associatePassword = function (credentials) {
                    /*jshint -W069 */
                    var deferred = $q.defer();
                    var currentUser = auth.$getAuth();

                    var authGroupRef = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
                    authGroupRef.orderByKey().equalTo('password').once('value', function (snapshot) {
                        var existsAuthGroup = (snapshot.val() !== null);
                        if (currentUser.provider === 'password' || existsAuthGroup) {
                            deferred.reject('You already is using an password account.');
                        } else {
                            $createUser(credentials)
                                .then(function (user) {
                                    var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
                                    userMappingRef.once("value", function (snapshot) {
                                        var exists = (snapshot.val() !== null);
                                        if (exists) {
                                            deferred.reject('User is already associated to another account');
                                        } else {
                                            var authGroupRefNew = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
                                            var authGroupRec = {};
                                            authGroupRec['password'] = user.uid;
                                            authGroupRefNew.update(authGroupRec, function () {
                                                var userMappingRef = new Firebase(ref.root() + '/userMapping');
                                                var userMappingRec = {};
                                                userMappingRec[user.uid] = currentUser.authGroup;
                                                userMappingRef.update(userMappingRec, function () {
                                                    deferred.resolve(user);
                                                });
                                            });
                                        }

                                    });
                                })
                                .catch(function (err) {
                                    deferred.reject(err);
                                });
                        }
                    });

                    return deferred.promise;
                };


                return auth;
            };

            return $delegate;

        }]);
    }]);