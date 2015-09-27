(function (angular) {
    "use strict";

    var app = angular.module('myApp.account', ['firebase', 'firebase.utils', 'firebase.auth', 'ngRoute']);

    app.controller('AccountCtrl', ['$scope', 'Auth', 'fbutil', 'user', '$location', '$firebaseObject', '$window',
        function ($scope, Auth, fbutil, user, $location, $firebaseObject, $window) {

            $scope.assoc = {};
            $scope.assoc.showAssoc = false;
            $scope.assoc.emailAssoc = null;
            $scope.assoc.passAssoc = null;

            var authGroup = $firebaseObject(fbutil.ref('authGroup', user.authGroup));
            var ubinbauthGroup;
            authGroup.$bindTo($scope, 'authGroup').then(function (ub) {
                ubinbauthGroup = ub;
            });

            //$scope.authGroup = $firebaseArray(fbutil.ref('authGroup', user.authGroup));

            var unbind;
            // create a 3-way binding with the user profile object in Firebase
            var profile = $firebaseObject(fbutil.ref('users', user.authGroup));
            profile.$bindTo($scope, 'profile').then(function (ub) {
                unbind = ub;
                $scope.assoc.emailAssoc = profile.email;
            });

            // expose logout function to scope
            $scope.logout = function () {
                if (unbind) {
                    unbind();
                }
                profile.$destroy();
                Auth.$unauth();
                $location.path('/login');
            };

            $scope.associateSocial = function (provider) {
                Auth.$associateSocial(provider)
                    .then(function (user) {
                        console.log(user);
                    })
                    .catch(function (err) {
                        alert(err);
                    });
            };

            $scope.associatePassword = function () {
                Auth.$associatePassword({email: $scope.assoc.emailAssoc, password: $scope.assoc.passAssoc})
                    .then(function (user) {
                        console.log(user);
                    })
                    .catch(function (err) {
                        alert(err);
                    });
            };

            $scope.disassociateSocial = function (uid, provider) {
                if ($window.confirm('Are you sure you want to disassociate ' + provider + ' account?')) {
                    Auth.$disassociateSocial(uid, provider)
                        .then(function () {
                            console.log('desassociated');
                        })
                        .catch(function (err) {
                            alert(err);
                        });
                }
            };


            $scope.changePassword = function (pass, confirm, newPass) {
                resetMessages();
                if (!pass || !confirm || !newPass) {
                    $scope.err = 'Please fill in all password fields';
                }
                else if (newPass !== confirm) {
                    $scope.err = 'New pass and confirm do not match';
                }
                else {
                    Auth.$changePassword({email: profile.email, oldPassword: pass, newPassword: newPass})
                        .then(function () {
                            $scope.msg = 'Password changed';
                        }, function (err) {
                            $scope.err = err;
                        })
                }
            };

            $scope.clear = resetMessages;

            $scope.changeEmail = function (pass, newEmail) {
                resetMessages();
                var oldEmail = profile.email;
                Auth.$changeEmail({oldEmail: oldEmail, newEmail: newEmail, password: pass})
                    .then(function () {
                        // store the new email address in the user's profile
                        return fbutil.handler(function (done) {
                            fbutil.ref('users', user.authGroup, 'email').set(newEmail, done);
                        });
                    })
                    .then(function () {
                        $scope.emailmsg = 'Email changed';
                    }, function (err) {
                        $scope.emailerr = err;
                    });
            };

            $scope.removeUser = function (pass) {
                console.log('removeUser');
                resetMessages();
                if (!pass) {
                    $scope.err = 'Please fill in all password fields';
                }
                else {
                    console.log('removing user');
                    Auth.$removeUser({email: profile.email, password: pass})
                        .then(function () {
                            console.log('user removed');
                            $scope.msg = 'User Removed';
                        }, function (err) {
                            $scope.err = err;
                        })
                }
            };

            function resetMessages() {
                $scope.err = null;
                $scope.msg = null;
                $scope.emailerr = null;
                $scope.emailmsg = null;
            }
        }
    ]);

    app.config(['$routeProvider', function ($routeProvider) {
        // require user to be authenticated before they can access this page
        // this is handled by the .whenAuthenticated method declared in
        // components/router/router.js
        $routeProvider.whenAuthenticated('/account', {
            templateUrl: 'account/account.html',
            controller: 'AccountCtrl'
        })
    }]);

})(angular);