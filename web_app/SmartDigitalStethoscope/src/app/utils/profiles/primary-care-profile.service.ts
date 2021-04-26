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


export interface dbPrimaryCareProf extends dbUser {
  patientIds: string[];
}

@Injectable({
  providedIn: "root",
})
export class PrimaryCareProfProfile extends UserProfile<dbPrimaryCareProf> implements OnDestroy {

  /** Creates the user profile from a User object */
  public register(user: User, patients: string[] = [], keepCurrentUser?: boolean): Promise<void> {
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
                allowedStorage: 1000, // 1 GB allowed by default
                audio_size: [],
                patientIds: patients,
                user_type: UserType.PrimaryCareProfessional
              })
            : null
        )
    );
  }
}
