// TODO: locale 네임스페이스 파일 추가 시, 해당 파일 타입 추가
export type CommonJson = typeof import('./en/common.json');
export type ErrorJson = typeof import('./en/error.json');
export type WelcomeJson = typeof import('./en/welcome.json');

// TODO: locale 네임스페이스 파일 추가 시, 해당 맵에 추가
export type NamespaceMap = {
  common: CommonJson;
  error: ErrorJson;
  welcome: WelcomeJson;
};

export type Namespace = keyof NamespaceMap;
export type NonCommonNamespace = Exclude<Namespace, 'common'>;
