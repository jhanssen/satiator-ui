import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileBrowserComponent } from './filebrowser/filebrowser.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MainComponent } from './main/main.component';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { SettingsComponent } from './settings/settings.component';

@NgModule({
    declarations: [
	AppComponent,
	FileBrowserComponent,
	MainComponent,
	SettingsComponent
    ],
    imports: [
	BrowserModule,
	AppRoutingModule,
	BrowserAnimationsModule,
	MatListModule,
	MatButtonModule,
	MatToolbarModule,
	MatIconModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})

export class AppModule { }
