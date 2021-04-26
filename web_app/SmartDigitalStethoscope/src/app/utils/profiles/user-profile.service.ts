import { Injectable, OnDestroy } from "@angular/core";
import {
  AuthService,
  User,
  DatabaseService,
  DatabaseDocument,
  dbCommon,
} from "../../connect";
import { Observable, Subscription, of, from } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
// import * as admin from 'firebase-admin';

export interface dbUser extends dbCommon {
  name: string;
  email: string;
  audio: string[];
  allowedStorage: number;
  audio_size: number[];
  user_type: UserType;
}

export enum UserType {
  Patient,
  PrimaryCareProfessional,
  Admin
}

@Injectable({
  providedIn: "root",
})
export abstract class UserProfile<T extends dbUser> extends DatabaseDocument<T> implements OnDestroy {
  /** Current user profile snapshot */
  public data: dbUser = null;
  private sub: Subscription;

  /** Returns the current authenticated user id */
  public async uid(): Promise<string> {
    return this.auth.userId();
  }

  constructor(readonly auth: AuthService, db: DatabaseService) {
    // Extends the DatabaseDocument with a null reference
    super(db, null);

    // Persists the user profile snapshot making sure the document reference is always up to date
    this.sub = this.stream().subscribe((profile) => {
      // if (profile.user_type === UserType.Admin) {
      //   this.initAdmin();
      // }
      (this.data = profile);
    });
  }

  // Disposes of the subscription
  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  // Creates the firestore document reference from the User object
  protected fromUser(user: User, keepCurrentUser?: boolean): this {
    if (!keepCurrentUser)
      this.ref = !!user ? this.db.doc(`users/${user.uid}`) : null;
    return this;
  }

  // Extends the streaming function to resolve the authenticated user first
  public stream(): Observable<T> {
    return this.auth.user$.pipe(
      // Resolves the authenticated user attaching the corresponding document reference
      tap((user) => this.fromUser(user)),
      // Strams the document with the authenticated user profile
      switchMap((user) => (!!user ? super.stream() : of(null)))
    );
  }
  
  public abstract register(user: User): Promise<void>;

  // private initAdmin(): void {
  //   console.log('Initializing Admin');
  //   let serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  //   console.log(serviceAccount);
  //   admin.initializeApp({
  //     credential: admin.credential.cert(JSON.parse(serviceAccount)),
  //     databaseURL: "https://smartdigitalstethoscope.firebaseio.com"
  //   });
  // }


  // /** Creates the user profile from a User object */
  // public register(user: User): Promise<void> {
  //   if (!user) {
  //     return Promise.reject(
  //       new Error("Can't create a profile from a null user object")
  //     );
  //   }

  //   console.log("Creating user profile for: ", user.email);

  //   // Checks for document existance first
  //   return (
  //     this.fromUser(user)
  //       .exists()
  //       // Sets the document content whenever missing
  //       .then((exists) =>
  //         !exists
  //           ? this.set({
  //               name: user.displayName,
  //               email: user.email,
  //               audio: [],
  //               allowedStorage: 1000, // 1 GB allowed by default
  //               audio_size: []
  //             })
  //           : null
  //       )
  //   );
  // }
}
