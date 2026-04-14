export type MessageTemplateType = 'birthday' | 'review';

export interface MessageTemplates {
  birthday: string;
  review: string;
}

export interface MessageTemplateEditorConfig {
  type: MessageTemplateType;
  title: string;
  description: string;
}