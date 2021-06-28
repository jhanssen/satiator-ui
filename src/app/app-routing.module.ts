import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FileBrowserComponent } from './filebrowser/filebrowser.component';

const routes: Routes = [
    { path: '', component: FileBrowserComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
