import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileBrowserComponent } from './filebrowser/filebrowser.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MainComponent } from './main/main.component';
import { SettingsComponent } from './settings/settings.component';
import { GameComponent } from './game/game.component';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@NgModule({
    declarations: [
        AppComponent,
        FileBrowserComponent,
        MainComponent,
        SettingsComponent,
        GameComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatListModule,
        MatButtonModule,
        MatToolbarModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})

export class AppModule { }
