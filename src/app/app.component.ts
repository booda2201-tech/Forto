import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

const APP_NAME = 'Forto Car Wash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private sub?: Subscription;

  constructor(
    private router: Router,
    private titleService: Title,
  ) {}

  ngOnInit(): void {
    this.updateTitle();
    this.sub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe(() => this.updateTitle());
  }

  private updateTitle(): void {
    const title = this.getPageTitle();
    this.titleService.setTitle(title ? `${title} | ${APP_NAME}` : APP_NAME);
  }

  private getPageTitle(): string | null {
    let route = this.router.routerState.root;
    while (route.firstChild) route = route.firstChild;
    return route.snapshot.data['title'] ?? null;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
