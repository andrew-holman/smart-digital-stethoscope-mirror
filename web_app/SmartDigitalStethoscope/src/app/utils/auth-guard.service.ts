import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, of, forkJoin, Subject } from "rxjs";
import { take, switchMap } from "rxjs/operators";
import { LoginComponent, loginAction } from "../login/login.component";
import { AuthService, User } from "../connect";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(readonly auth: AuthService, private dialog: MatDialog) {}

  /** Returns true whenever the user is authenticated */
  get authenticated() {
    return this.auth.authenticated;
  }

  /** Returns the current authenticated user id */
  get userId() {
    return this.auth.userId;
  }

  /** Prompts the user for authentication */
  public prompt(data: loginAction = "signIn"): Promise<User> {
    return this.dialog
      .open<LoginComponent, loginAction, User>(LoginComponent, { data })
      .afterClosed()
      .toPromise();
  }

  /** Performs the user authentication prompting the user when neeed or resolving to the current authenticated user otherwise */
  public authenticate(action: loginAction = "signIn"): Promise<User> {
    return this.auth.user$
      .pipe(
        take(1),

        switchMap((user) => (!user ? this.prompt(action) : of(user)))
      )
      .toPromise();
  }

  /** Disconnects the user */
  public disconnect(): Promise<void> {
    return this.auth.signOut();
  }

  // Implements single route user authentication guarding
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // Gets the authorization mode when specified
    const mode = route.queryParamMap.get("authMode") || "signIn";
    // Prompts the user for authentication
    return this.authenticate(mode as loginAction).then((user) => !!user);
  }
}
