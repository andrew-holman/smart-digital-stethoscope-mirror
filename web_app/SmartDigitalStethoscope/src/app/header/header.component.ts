import { Component, OnInit, AfterViewInit, Input } from "@angular/core";
import { AuthGuard } from "../utils/auth-guard.service";
import { AuthService, User } from "../connect";
import { interval } from "rxjs";

@Component({
  selector: "dss-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.css"],
})
export class HeaderComponent implements OnInit {
  auth: AuthGuard;
  authService: AuthService;

  user: User;

  constructor(auth: AuthGuard, authService: AuthService) {
    this.auth = auth;
    this.authService = authService;
  }

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => (this.user = user));
  }
  openLogin(): void {
    this.auth.authenticate();
  }
  signout(): void {
    this.authService.signOut();
  }

  displayUserInfo(user: User): string {
    if (!user) {
      return "";
    }
    return user.displayName;
  }
}
