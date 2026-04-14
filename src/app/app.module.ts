import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ClientesTableComponent } from './components/clientes-table/clientes-table.component';
import { UploadXmlModalComponent } from './components/upload-xml-modal/upload-xml-modal.component';
import { MessageTemplateModalComponent } from './components/message-template-modal/message-template-modal.component';
import { AboutModalComponent } from './components/about-modal/about-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    ClientesTableComponent,
    UploadXmlModalComponent,
    MessageTemplateModalComponent,
    AboutModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
