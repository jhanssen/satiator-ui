import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { SettingsComponent } from './settings/settings.component';
import { GameComponent } from './game/game.component';

const routes: Routes = [
    { path: '', component: MainComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'game/:name', component: GameComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
