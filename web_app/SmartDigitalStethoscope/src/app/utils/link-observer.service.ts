import { Injectable } from '@angular/core';
import { Router, UrlTree, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, ParamMap } from '@angular/router';
import { Observable, of, forkJoin, Subject } from 'rxjs';
import { switchMap, filter, first, map, tap, zip, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ActionLink implements CanActivate {

  private observers = new Subject<ActivatedRouteSnapshot>();

  // Implements single route user authentication guarding
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {

    console.log(route, state);
    // Pushes the snapshot for observers to react, eventually
    this.observers.next(route);
    // Prevents the real routing
    return false;
  }

  public register(...actions: string[]): Observable<ParamMap> {

    return this.observers.pipe( 
      filter( request => actions.some( action => request.data.action === action ) ),
      map( route => route.queryParamMap ) 
    );
  }
}