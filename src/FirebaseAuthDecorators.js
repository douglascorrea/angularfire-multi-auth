(function () {
	'use strict';
	angular.module('angularfire-multi-auth')
		.config(['$provide', function ($provide) {
			$provide.decorator('$firebaseAuth', ['$delegate', '$q', '$window', 'FBURL_ALTERNATE', function ($delegate, $q, $window, FBURL_ALTERNATE) {
				/* jshint validthis: true */
				var construct = $delegate;

				$delegate = function (ref) {

					var auth;
					var firebaseSession;
					var base;

					init();

					function init() {
						//init firebaseSession Wrapper
						firebaseSession = new FirebaseSession(ref);
						/*
						Storing the original methods to be called later
						*/
						auth = construct(ref);
						base = {
							$createUser: auth.$createUser,
							$removeUser: auth.$removeUser,
							$authWithPassword: auth.$authWithPassword,
							$authWithOAuthPopup: auth.$authWithOAuthPopup,
							$authAnonymously: auth.$authAnonymously
						};

						auth.$createUser = createUser;
						auth.$removeUser = removeUser;
						auth.$authWithPassword = authWithPassword;
						auth.$authWithOAuthPopup = authWithOAuthPopup;
						auth.$authAnonymously = authAnonymously;
						auth.$associateSocial = associateSocial;
						auth.$disassociateSocial = disassociateSocial;
						auth.$associatePassword = associatePassword;
					}

					return auth;


					/////////////////////////////////////////////////////////////////////////////////////////////
					//PUBLIC METHODS
					/////////////////////////////////////////////////////////////////////////////////////////////
					/*
					 This method is being decorated to create the mapping for the user that is being created.
					 We don' need to make a query first because we can't create duplicated users (with email/password)
					 Firebase take care of it on email/password.
					 */
					function createUser(credentials) {
						var deferred = $q.defer();
						base.$createUser(credentials)
							.then(function (userData) {
								base.$authWithPassword(credentials)
									.then(function (user) {
										addUser(user, function () {
											auth.$unauth();
											deferred.resolve(userData);
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
					}

					/*
					 This method is being decorated to remove the mapping for the user that is being removed.
					 */
					function removeUser(credentials) {
						var deferred = $q.defer();
						base.$authWithPassword(credentials)
							.then(function (user) {
								var authGroupRef = new Firebase(ref.root() + '/authGroup');
								authGroupRef.orderByChild(user.provider).equalTo(user.uid).on('child_added', function (snapshot) {
									snapshot.ref().remove(function (err) {
										if (!err) {
											auth.$unauth();
											base.$removeUser(credentials)
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
					}

					/*
					 This method is being decorated to get the authGroup associated to the user that is logging in.
					 */
					function authWithPassword(credentials, options) {
						var deferred = $q.defer();
						base.$authWithPassword(credentials, options)
							.then(function (user) {
								updateOrAddUser(user, deferred);
							})
							.catch(function (err) {
								deferred.reject(err);
							});
						return deferred.promise;
					}

					/*
					 This method is being decorated to get the authGroup associated to the user that is logging in via social accounts.
					 */
					function authWithOAuthPopup(provider, options) {
						var deferred = $q.defer();
						base.$authWithOAuthPopup(provider, options)
							.then(function (user) {
								updateOrAddUser(user, deferred);
							})
							.catch(function (err) {
								deferred.reject(err);
							});
						return deferred.promise;
					}

					/*
					 This method is being decorated to get the authGroup associated to the user that is logging in via anonymous method.
					 */
					function authAnonymously(options) {

						/*jshint -W069 */
						var deferred = $q.defer();
						var currentUser = auth.$getAuth();

						var authGroupRef = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
						authGroupRef.orderByKey().equalTo('password').once('value', function (snapshot) {
							var existsAuthGroup = (snapshot.val() !== null);
							if (currentUser.provider === 'anonymous' || existsAuthGroup) {
								deferred.resolve(currentUser);
							} else {
								base.$authAnonymously(options)
									.then(function (user) {
										updateOrAddUser(user, deferred);
									})
									.catch(function (err) {
										deferred.reject(err);
									});
							}
						});
						return deferred.promise;
					}

					/*
					 This method will be used to associate a social account to the current logged user
					 */
					function associateSocial(provider) {
						var deferred = $q.defer();
						var newRef = new Firebase(FBURL_ALTERNATE);
						var newAuth = $delegate(newRef);
						var currentUser = auth.$getAuth();

						var authGroupRef = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
						authGroupRef.orderByKey().equalTo(provider).once('value', function (snapshot) {
							if (provider === currentUser.provider || snapshot.val() !== null) {
								deferred.reject('You are already using a ' + provider + ' account.');
							} else {
								newAuth.$authWithOAuthPopup(provider)
									.then(function (user) {
										var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
										userMappingRef.once('value', function (snapshot) {
											var exists = (snapshot.val() !== null);
											if (exists) {
												deferred.reject('You are already associated to another account');
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
					}

					/*
					 This method will be used to disassociate a social account to the current logged user
					 */
					function disassociateSocial(uid, provider) {
						var deferred = $q.defer();
						var currentUser = auth.$getAuth();
						if (uid === currentUser.uid) {
							deferred.reject('The account you want to disassociate is the logged on user, please logoff and login with another account');
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
					}

					/*
					 This method will be used to associate a email/password account to the current logged user
					 */
					function associatePassword(credentials) {
						/*jshint -W069 */
						var deferred = $q.defer();
						var currentUser = auth.$getAuth();

						var authGroupRef = new Firebase(ref.root() + '/authGroup/' + currentUser.authGroup);
						authGroupRef.orderByKey().equalTo('password').once('value', function (snapshot) {
							var existsAuthGroup = (snapshot.val() !== null);
							if (currentUser.provider === 'password' || existsAuthGroup) {
								deferred.reject('You are already  using a password account.');
							} else {
								base.$createUser(credentials)
									.then(function (user) {
										var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
										userMappingRef.once('value', function (snapshot) {
											var exists = (snapshot.val() !== null);
											if (exists) {
												deferred.reject('the email is already associated with another account');
											} else {
												var userRef = new Firebase(ref.root() + '/users/' + currentUser.authGroup);
												userRef.update({
													email: credentials.email
												});

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
					}


					////////////////////////////////////////////////////////////////////////////////////////////////////////////
					//PRIVATE FUNCTIONS
					////////////////////////////////////////////////////////////////////////////////////////////////////////////
					function FirebaseSession(ref) {
						var domain = extractEnviroment(extractDomain(ref.root().toString()));
						var firebaseSessionName = 'firebase:session::' + domain;
						var func = {
							get: getFirebaseSession,
							set: setFirebaseSession
						};
						return func;

						function getFirebaseSession() {
							return JSON.parse($window.localStorage.getItem(firebaseSessionName));
						}

						function setFirebaseSession(currentSession) {
							$window.localStorage.setItem(firebaseSessionName, JSON.stringify(currentSession));
						}

						/*
						Function used to remove root domain from Firebase ref
						*/
						function extractDomain(url) {
							var domain;
							if (url.indexOf('://') > -1) {
								domain = url.split('/')[2];
							} else {
								domain = url.split('/')[0];
							}
							domain = domain.split(':')[0];
							return domain;
						}

						function extractEnviroment(domain) {
							return domain.split('.firebaseio.com')[0];
						}
					}

					/*
					    this will add the existing user 
					*/
					function addUser(user, updateCallBack) {
						var authGroupRef = new Firebase(ref.root() + '/authGroup');
						var authGroupRec = {};
						authGroupRec[user.provider] = user.uid;
						var authGroup = authGroupRef.push(authGroupRec, function () {
							var userMappingRef = new Firebase(ref.root() + '/userMapping');
							var userMappingRec = {};
							userMappingRec[user.uid] = authGroup.key();
							userMappingRef.update(userMappingRec, updateCallBack(authGroup));
						});
						return user;
					}
					/*
					    this will update or add the existing user 
					*/
					function updateOrAddUser(user, deferred) {
						var currentSession = firebaseSession.get();
						var userMappingRef = new Firebase(ref.root() + '/userMapping/' + user.uid);
						userMappingRef.once('value', function (snapshot) {
							var exists = (snapshot.val() !== null);
							if (exists) {
								currentSession.authGroup = snapshot.val();
								user.authGroup = snapshot.val();
								firebaseSession.set(currentSession);
								deferred.resolve(user);
							} else {
								addUser(user, function (authGroup) {
									currentSession.authGroup = authGroup.key();
									user.authGroup = authGroup.key();
									firebaseSession.set(currentSession);
									deferred.resolve(user);
								});
							}
							return user;
						});
					}
				};

				return $delegate;

                    }]);
            }]);
})();