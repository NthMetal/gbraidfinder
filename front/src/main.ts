import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

/** Deprecated old url, redirect to new one if they visit this one */
if (window.location.host === 'gbraidfinder.s3-website.us-east-2.amazonaws.com') {
  window.location.replace("https://gbraidfinder.ogres.cc");
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
