import { Component, OnDestroy, OnInit, Output } from "@angular/core";
import { AuthGuard } from "./utils/auth-guard.service";
import { dbUser, UserProfile } from "./utils/profiles/user-profile.service";
import { Router } from "@angular/router";
import { MatIconRegistry } from "@angular/material/icon";
import { map, filter } from "rxjs/operators";
import { Observable, Subscription } from "rxjs";
import { AuthService, User } from "./connect";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit, OnDestroy {
  readonly userName$: Observable<string>;
  private sub: Subscription;
  title = "SmartDigitalStethoscope";

  get auth() {
    return this.profile.auth;
  }

  get authenticated() {
    return this.guard.authenticated;
  }

  constructor(
    readonly guard: AuthGuard,
    private profile: UserProfile<dbUser>,
    readonly router: Router,
    private icon: MatIconRegistry
  ) {
    // Streams the user name from the profile
    this.userName$ = this.profile
      .stream()
      .pipe(map((data) => (!!data ? data.name : "")));
  }

  ngOnInit() {
    // Registers font awesome among the available sets of icons for mat-icon component
    this.icon.registerFontClassAlias("fontawesome", "fa");

    // Monitors the authState making sure to navigate home whenever the user signs out
    // including when the account has been deleted
    this.sub = this.auth.authState$
      .pipe(filter((user) => !user))
      .subscribe(() => this.router.navigate(["/"]));
    this.guard.authenticate();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
