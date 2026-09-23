import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

import {
  auth,
  db,
  isAdminIdentity,
  isFirebaseConfigured,
} from '../firebase/config';

import {
  getUsers,
  saveUser,
} from '../lib/localData';

const AuthContext = createContext(null);

const STORAGE_KEY = 'fashion_eye_care_user';

const OTP_API_URL =
  import.meta.env.VITE_OTP_API_URL || '/api';

/*
=========================================================
PERSIST USER SESSION
=========================================================
*/
const persistUserSession = (nextUser) => {
  if (typeof window === 'undefined') return;

  if (nextUser) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextUser)
    );
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

/*
=========================================================
AUTH PROVIDER
=========================================================
*/
export function AuthProvider({ children }) {
  /*
  -------------------------------------------------------
  RESTORE USER FROM LOCAL STORAGE
  -------------------------------------------------------
  */
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return null;
      }

      return JSON.parse(saved);
    } catch (error) {
      console.warn(
        'Unable to restore saved user session:',
        error
      );

      localStorage.removeItem(STORAGE_KEY);

      return null;
    }
  });

  /*
  -------------------------------------------------------
  FIREBASE AUTH LOADING STATE
  -------------------------------------------------------

  Firebase restores an existing authentication session
  asynchronously.

  While loading is true, ProtectedRoute must NOT decide
  that the user is logged out.
  -------------------------------------------------------
  */
  const [loading, setLoading] = useState(true);

  /*
  =======================================================
  FIREBASE AUTH STATE LISTENER
  =======================================================
  */
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    /*
    If Firebase is not configured, there is no Firebase
    session to restore.
    */
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    /*
    Firebase automatically restores the existing admin
    authentication session.
    */
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          /*
          ===============================================
          FIREBASE USER EXISTS
          ===============================================
          */
          if (firebaseUser) {
            let adminProfile = null;

            /*
            Read optional admin profile from Firestore.
            */
            if (db) {
              try {
                const userDocSnap = await getDoc(
                  doc(
                    db,
                    'users',
                    firebaseUser.uid
                  )
                );

                if (userDocSnap.exists()) {
                  adminProfile =
                    userDocSnap.data();
                }
              } catch (error) {
                console.warn(
                  'Could not read admin user profile from Firestore:',
                  error
                );
              }
            }

            /*
            Build the admin session object.
            */
            const nextAdmin = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName:
                adminProfile?.fullName ||
                firebaseUser.displayName ||
                'Administrator',
              role: 'admin',
              isAdmin: true,
              createdAt:
                adminProfile?.createdAt ||
                new Date().toISOString(),
            };

            /*
            Update React state.
            */
            setUser(nextAdmin);

            /*
            Keep the admin session in localStorage.
            */
            persistUserSession(nextAdmin);

            return;
          }

          /*
          ===============================================
          NO FIREBASE USER
          ===============================================

          Customers do not use Firebase Authentication.

          Their session is stored in localStorage, so we
          must NOT remove a customer session just because
          Firebase returns null.
          ===============================================
          */
          const currentSaved =
            localStorage.getItem(STORAGE_KEY);

          if (!currentSaved) {
            setUser(null);
            return;
          }

          try {
            const parsed =
              JSON.parse(currentSaved);

            /*
            If the saved session belongs to an admin,
            but Firebase says there is no authenticated
            Firebase user, remove the stale admin session.
            */
            if (
              parsed?.role === 'admin' ||
              parsed?.isAdmin
            ) {
              setUser(null);
              persistUserSession(null);
            } else {
              /*
              Customer session:
              keep it.
              */
              setUser(parsed);
            }
          } catch (error) {
            console.warn(
              'Unable to parse saved authentication session:',
              error
            );

            setUser(null);
            persistUserSession(null);
          }
        } finally {
          /*
          ===============================================
          AUTH CHECK FINISHED
          ===============================================

          ProtectedRoute can now safely determine whether
          the user is authenticated.
          */
          setLoading(false);
        }
      }
    );

    /*
    Cleanup Firebase listener.
    */
    return () => {
      unsubscribe();
    };
  }, []);

  /*
  =======================================================
  SEND OTP
  =======================================================
  */
  const sendOtp = async ({ email }) => {
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        'Email is required to receive the OTP.'
      );
    }

    try {
      const response = await fetch(
        `${OTP_API_URL}/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const payload =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'Unable to send OTP email.'
        );
      }

      return {
        email: normalizedEmail,
        message:
          payload.message ||
          `OTP sent to ${normalizedEmail}.`,
      };
    } catch (error) {
      throw new Error(
        error.message ||
          'Unable to send OTP email.'
      );
    }
  };

  /*
  =======================================================
  VERIFY OTP
  =======================================================
  */
  const verifyOtp = async ({ email, otp }) => {
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    const normalizedOtp = String(otp || '')
      .trim();

    if (!normalizedEmail || !normalizedOtp) {
      throw new Error(
        'Email and OTP are required.'
      );
    }

    try {
      const response = await fetch(
        `${OTP_API_URL}/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            otp: normalizedOtp,
          }),
        }
      );

      const payload =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'Unable to verify OTP.'
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        error.message ||
          'Unable to verify OTP.'
      );
    }
  };

  /*
  =======================================================
  CUSTOMER SIGNUP
  =======================================================
  */
  const signup = async ({
    fullName,
    email,
    password,
    isEmailVerified = false,
  }) => {
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!isEmailVerified) {
      throw new Error(
        'Email must be verified before creating the account.'
      );
    }

    /*
    -----------------------------------------------------
    FIREBASE / FIRESTORE CUSTOMER SIGNUP
    -----------------------------------------------------
    */
    if (isFirebaseConfigured && db) {
      const usersRef =
        collection(db, 'users');

      const q = query(
        usersRef,
        where(
          'email',
          '==',
          normalizedEmail
        )
      );

      const existingSnap =
        await getDocs(q);

      if (!existingSnap.empty) {
        throw new Error(
          'An account with this email already exists. Please login instead.'
        );
      }

      const newDocRef =
        doc(usersRef);

      const customerRecord = {
        id: newDocRef.id,
        uid: newDocRef.id,
        fullName:
          fullName?.trim() || 'Customer',
        email: normalizedEmail,
        password,
        role: 'customer',
        isAdmin: false,
        createdAt:
          new Date().toISOString(),
        updatedAt:
          new Date().toISOString(),
      };

      await setDoc(
        newDocRef,
        customerRecord
      );

      const sessionUser = {
        id: customerRecord.id,
        uid: customerRecord.uid,
        fullName:
          customerRecord.fullName,
        email:
          customerRecord.email,
        role: 'customer',
        isAdmin: false,
        createdAt:
          customerRecord.createdAt,
      };

      setUser(sessionUser);
      persistUserSession(sessionUser);

      return sessionUser;
    }

    /*
    -----------------------------------------------------
    LOCAL STORAGE FALLBACK
    -----------------------------------------------------
    */
    const existingUsers =
      getUsers();

    if (
      existingUsers.some(
        (entry) =>
          String(
            entry.email || ''
          ).toLowerCase() ===
          normalizedEmail
      )
    ) {
      throw new Error(
        'Account already exists. Please login instead.'
      );
    }

    const newUser = {
      id:
        crypto.randomUUID
          ? crypto.randomUUID()
          : `user-${Date.now()}`,
      fullName:
        fullName || 'Customer',
      email: normalizedEmail,
      password,
      role: 'customer',
      isAdmin: false,
      createdAt:
        new Date().toISOString(),
    };

    saveUser(newUser);

    const storedUser = {
      ...newUser,
      password: undefined,
    };

    setUser(storedUser);
    persistUserSession(storedUser);

    return storedUser;
  };

  /*
  =======================================================
  LOGIN
  =======================================================
  */
  const login = async ({
    email,
    password,
  }) => {
    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    /*
    =====================================================
    1. FIREBASE AUTH
    =====================================================

    Used for ADMIN login.
    */
    if (
      isFirebaseConfigured &&
      auth
    ) {
      try {
        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
          );

        const firebaseUser =
          userCredential.user;

        let adminProfile = null;

        if (db) {
          try {
            const userDocSnap =
              await getDoc(
                doc(
                  db,
                  'users',
                  firebaseUser.uid
                )
              );

            if (
              userDocSnap.exists()
            ) {
              adminProfile =
                userDocSnap.data();
            }
          } catch (error) {
            console.warn(
              'Could not read admin profile from Firestore:',
              error
            );
          }
        }

        const adminUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email:
            firebaseUser.email ||
            normalizedEmail,
          fullName:
            adminProfile?.fullName ||
            firebaseUser.displayName ||
            'Administrator',
          role: 'admin',
          isAdmin: true,
          createdAt:
            adminProfile?.createdAt ||
            new Date().toISOString(),
        };

        setUser(adminUser);
        persistUserSession(adminUser);

        return adminUser;
      } catch (error) {
        /*
        Firebase login failed.

        Continue checking the custom customer
        account below.
        */
      }
    }

    /*
    =====================================================
    2. FIRESTORE CUSTOMER LOGIN
    =====================================================
    */
    if (
      isFirebaseConfigured &&
      db
    ) {
      try {
        const usersRef =
          collection(db, 'users');

        const q = query(
          usersRef,
          where(
            'email',
            '==',
            normalizedEmail
          )
        );

        const snap =
          await getDocs(q);

        if (!snap.empty) {
          const customerDoc =
            snap.docs[0].data();

          if (
            String(
              customerDoc.password || ''
            ) === String(password)
          ) {
            const customerUser = {
              id: snap.docs[0].id,
              uid: snap.docs[0].id,
              fullName:
                customerDoc.fullName ||
                'Customer',
              email:
                customerDoc.email,
              role:
                customerDoc.role ||
                'customer',
              isAdmin: Boolean(
                customerDoc.isAdmin ||
                  customerDoc.role ===
                    'admin'
              ),
              createdAt:
                customerDoc.createdAt ||
                new Date().toISOString(),
            };

            setUser(customerUser);
            persistUserSession(
              customerUser
            );

            return customerUser;
          }

          throw new Error(
            'Invalid email or password.'
          );
        }
      } catch (error) {
        if (
          error.message ===
          'Invalid email or password.'
        ) {
          throw error;
        }

        console.warn(
          'Firestore customer lookup failed:',
          error
        );
      }
    }

    /*
    =====================================================
    3. LOCAL CUSTOMER LOGIN FALLBACK
    =====================================================
    */
    const existingUsers =
      getUsers();

    const matched =
      existingUsers.find(
        (entry) =>
          String(
            entry.email || ''
          ).toLowerCase() ===
            normalizedEmail &&
          String(
            entry.password || ''
          ) === String(password)
      );

    if (matched) {
      const safeUser = {
        ...matched,
        id: matched.id,
        uid: matched.id,
        email: String(
          matched.email ||
            normalizedEmail
        ).toLowerCase(),
        role:
          matched.role ||
          'customer',
        isAdmin: Boolean(
          matched.isAdmin ||
            matched.role ===
              'admin'
        ),
        password: undefined,
      };

      setUser(safeUser);
      persistUserSession(
        safeUser
      );

      return safeUser;
    }

    throw new Error(
      'Invalid email or password.'
    );
  };

  /*
  =======================================================
  LOGOUT
  =======================================================
  */
  const logout = async () => {
    if (
      isFirebaseConfigured &&
      auth
    ) {
      try {
        await signOut(auth);
      } catch (error) {
        console.warn(
          'Sign out error:',
          error
        );
      }
    }

    setUser(null);
    persistUserSession(null);
  };

  /*
  =======================================================
  CONTEXT VALUE
  =======================================================
  */
  const value = useMemo(
    () => ({
      user,
      loading,
      signup,
      login,
      logout,
      sendOtp,
      verifyOtp,
      isAdmin:
        isAdminIdentity(user),
    }),
    [
      user,
      loading,
    ]
  );

  /*
  =======================================================
  PROVIDER
  =======================================================
  */
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/*
=========================================================
USE AUTH
=========================================================
*/
export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}