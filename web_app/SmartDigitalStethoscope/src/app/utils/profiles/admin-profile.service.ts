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
import { dbUser, UserProfile, UserType } from './user-profile.service';


export interface dbAdmin extends dbUser {}

@Injectable({
  providedIn: "root",
})
export class AdminProfile extends UserProfile<dbAdmin> implements OnDestroy {

  /** Creates the user profile from a User object */
  public register(user: User, keepCurrentUser?: boolean): Promise<void> {
    if (!user) {
      return Promise.reject(
        new Error("Can't create a profile from a null user object")
      );
    }

    console.log("Creating patient profile for: ", user.email);

    // Checks for document existance first
    return (
      this.fromUser(user, keepCurrentUser)
        .exists()
        // Sets the document content whenever missing
        .then((exists) =>
          !exists
            ? this.set({
                name: user.displayName,
                email: user.email,
                audio: [],
                allowedStorage: 10000, // 1 GB allowed by default
                audio_size: [],
                user_type: UserType.Admin
              })
            : null
        )
    );
  }
}
