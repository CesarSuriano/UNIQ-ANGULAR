import { Component, HostListener, OnInit } from '@angular/core';

import { ClientesDataService } from './services/clientes-data.service';
import { compareClientes } from './helpers/cliente-date.helper';
import { buildYearEndMessage } from './helpers/cliente-message.helper';
import { MESSAGE_TEMPLATE_EDITOR_CONFIG } from './helpers/message-template.helper';
import { APP_VERSION, APP_WHATS_NEW } from './helpers/app-info.helper';
import { formatTimestamp } from './helpers/timestamp.helper';
import { parseClientesFromXml } from './helpers/clientes-xml.helper';
import { Cliente, ClientesLoadResult, SortColumn, SortDirection } from './models/cliente.model';
import { MessageTemplateEditorConfig, MessageTemplateType, MessageTemplates } from './models/message-template.model';
import { MessageTemplateService } from './services/message-template.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  clientes: Cliente[] = [];
  sortedColumn: SortColumn = 'dataNascimento';
  sortDirection: SortDirection = 'asc';

  isLoading = false;
  hasError = false;
  isUploadModalOpen = false;
  isDraggingFile = false;
  isSavingUpload = false;
  isConfigMenuOpen = false;
  isMessageTemplateModalOpen = false;
  isSavingTemplate = false;
  isAboutModalOpen = false;

  lastUpdated: string | null = null;
  storedFileName: string | null = null;
  storedSavedAtLabel: string | null = null;
  selectedFileName: string | null = null;
  uploadErrorMessage: string | null = null;
  successToastMessage: string | null = null;
  activeTemplateEditorConfig: MessageTemplateEditorConfig | null = null;

  pendingXmlContent: string | null = null;
  messageTemplates: MessageTemplates;

  readonly primaryColor = '#751013';
  readonly googleReviewUrl = '';
  readonly appVersion = APP_VERSION;
  readonly appWhatsNew = APP_WHATS_NEW;

  private readonly yearEndButtonDeadline = new Date(2025, 11, 26, 23, 59, 59, 999);

  constructor(
    private clientesDataService: ClientesDataService,
    private messageTemplateService: MessageTemplateService
  ) {
    this.messageTemplates = this.messageTemplateService.getTemplates();
  }

  ngOnInit(): void {
    this.initializeClientes();
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (!this.isUploadModalOpen) {
      return;
    }

    event.preventDefault();
    this.isDraggingFile = true;
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent): void {
    if (!this.isUploadModalOpen) {
      return;
    }

    event.preventDefault();
    this.isDraggingFile = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    this.onXmlFileChosen(file);
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent): void {
    if (!this.isUploadModalOpen) {
      return;
    }

    if (event.clientX <= 0 || event.clientY <= 0) {
      this.isDraggingFile = false;
    }
  }

  get isYearEndButtonAvailable(): boolean {
    const today = new Date();
    return today <= this.yearEndButtonDeadline;
  }

  get sortedClientes(): Cliente[] {
    const clientesCopy = [...this.clientes];
    clientesCopy.sort((a, b) => this.compareClientes(a, b));
    return clientesCopy;
  }

  changeSort(column: SortColumn): void {
    if (this.sortedColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortedColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getSortArrow(column: SortColumn): string {
    if (this.sortedColumn !== column) {
      return '';
    }
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  getRowClass(cliente: Cliente): string {
    if (cliente.birthdayStatus === 'today') {
      return 'row-birthday-today';
    }
    if (cliente.birthdayStatus === 'upcoming') {
      return 'row-birthday-upcoming';
    }
    return '';
  }

  openUploadModal(): void {
    this.isConfigMenuOpen = false;
    this.isUploadModalOpen = true;
    this.isDraggingFile = false;
    this.isSavingUpload = false;
    this.uploadErrorMessage = null;
  }

  closeUploadModal(): void {
    if (this.isSavingUpload) {
      return;
    }

    this.isUploadModalOpen = false;
    this.isDraggingFile = false;
    this.uploadErrorMessage = null;
    this.pendingXmlContent = null;
    this.selectedFileName = null;
  }

  setDraggingState(isDragging: boolean): void {
    this.isDraggingFile = isDragging;
  }

  toggleConfigMenu(): void {
    this.isConfigMenuOpen = !this.isConfigMenuOpen;
  }

  openTemplateEditor(type: MessageTemplateType): void {
    this.isConfigMenuOpen = false;
    this.activeTemplateEditorConfig = MESSAGE_TEMPLATE_EDITOR_CONFIG[type];
    this.isMessageTemplateModalOpen = true;
  }

  openAboutModal(): void {
    this.isConfigMenuOpen = false;
    this.isAboutModalOpen = true;
  }

  closeAboutModal(): void {
    this.isAboutModalOpen = false;
  }

  closeTemplateEditor(): void {
    if (this.isSavingTemplate) {
      return;
    }

    this.isMessageTemplateModalOpen = false;
    this.activeTemplateEditorConfig = null;
  }

  async saveTemplate(template: string): Promise<void> {
    if (!this.activeTemplateEditorConfig) {
      return;
    }

    this.isSavingTemplate = true;

    try {
      await this.delay(400);
      this.messageTemplates = this.messageTemplateService.saveTemplate(this.activeTemplateEditorConfig.type, template);
      this.isSavingTemplate = false;
      this.closeTemplateEditor();
      this.showSuccessToast('Mensagem atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar template de mensagem', error);
    } finally {
      this.isSavingTemplate = false;
    }
  }

  onXmlFileChosen(file: File): void {
    void this.readXmlFile(file);
  }

  async saveUploadedFile(): Promise<void> {
    if (!this.pendingXmlContent || !this.selectedFileName) {
      return;
    }

    this.isSavingUpload = true;
    this.isDraggingFile = false;
    this.uploadErrorMessage = null;

    try {
      await this.delay(700);
      const result = this.clientesDataService.saveUploadedXml(this.selectedFileName, this.pendingXmlContent);
      this.applyLoadResult(result);
      this.isSavingUpload = false;
      this.showSuccessToast('Dados atualizados com sucesso.');
      this.closeUploadModal();
    } catch (error) {
      console.error('Erro ao salvar XML enviado', error);
      this.uploadErrorMessage = 'Não foi possível salvar esse arquivo. Verifique se ele é um XML válido.';
    } finally {
      this.isSavingUpload = false;
    }
  }

  private initializeClientes(): void {
    this.isLoading = true;
    this.clientes = [];
    setTimeout(() => {
      this.loadClientes();
    }, 1000);
  }

  openWhatsappBirthday(cliente: Cliente): void {
    const message = this.messageTemplateService.renderTemplate('birthday', cliente);
    this.openWhatsapp(cliente.telefone, message);
  }

  openWhatsappReview(cliente: Cliente): void {
    const message = this.messageTemplateService.renderTemplate('review', cliente);
    this.openWhatsapp(cliente.telefone, message);
  }

  openWhatsappYearEnd(cliente: Cliente): void {
    if (!this.isYearEndButtonAvailable) {
      return;
    }
    const message = this.buildYearEndMessage(cliente);
    this.openWhatsapp(cliente.telefone, message);
  }

  private loadClientes(): void {
    this.isLoading = true;
    this.hasError = false;

    this.clientesDataService.loadClientes().subscribe({
      next: result => {
        this.applyLoadResult(result);
        this.isLoading = false;
      },
      error: error => {
        console.error('Erro ao carregar clientes.xml', error);
        this.clientes = [];
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  private compareClientes(a: Cliente, b: Cliente): number {
    return compareClientes(a, b, this.sortedColumn, this.sortDirection);
  }

  private openWhatsapp(phone: string, message: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      return;
    }
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    window.open(url, '_blank');
  }

  private buildYearEndMessage(cliente: Cliente): string {
    return buildYearEndMessage(cliente);
  }
  get activeTemplateText(): string {
    if (!this.activeTemplateEditorConfig) {
      return '';
    }

    return this.messageTemplates[this.activeTemplateEditorConfig.type];
  }

  private async readXmlFile(file: File): Promise<void> {
    this.uploadErrorMessage = null;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      this.pendingXmlContent = null;
      this.selectedFileName = null;
      this.uploadErrorMessage = 'Selecione um arquivo com extensão .xml.';
      return;
    }

    try {
      const fileContent = await file.text();
      parseClientesFromXml(fileContent);
      this.pendingXmlContent = fileContent;
      this.selectedFileName = file.name;
    } catch (error) {
      console.error('Erro ao ler XML selecionado', error);
      this.pendingXmlContent = null;
      this.selectedFileName = null;
      this.uploadErrorMessage = 'Não foi possível ler esse arquivo. Verifique se ele é um XML válido.';
    }
  }

  private applyLoadResult(result: ClientesLoadResult): void {
    this.clientes = result.clientes;
    this.storedFileName = result.fileName ?? 'clientes.xml (padrão)';
    this.storedSavedAtLabel = formatTimestamp(result.loadedAt);
    this.hasError = false;
    this.lastUpdated = formatTimestamp(result.loadedAt);
  }

  private showSuccessToast(message: string): void {
    this.successToastMessage = message;
    window.setTimeout(() => {
      if (this.successToastMessage === message) {
        this.successToastMessage = null;
      }
    }, 3000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      window.setTimeout(resolve, ms);
    });
  }
}
