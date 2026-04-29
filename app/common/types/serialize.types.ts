// * Serialized 직렬화 타입 추론
// NOTE: React Router 프레임워크가 처리하는 Serialize 타입 추론과 동일한 구현
type unstable_SerializesTo<T> = {
  unstable__ReactRouter_SerializesTo: [T];
};

export type Serializable =
  | undefined
  | null
  | boolean
  | string
  | symbol
  | number
  | Array<Serializable>
  | { [key: PropertyKey]: Serializable }
  | bigint
  | Date
  | URL
  | RegExp
  | Error
  | Map<Serializable, Serializable>
  | Set<Serializable>
  | Promise<Serializable>;

export type Serialized<T> =
  T extends unstable_SerializesTo<infer To>
    ? To
    : // Serializable이면 그대로 통과
      T extends Serializable
      ? T
      : // 함수는 직렬화 불가 -> undefined
        T extends (...args: any[]) => unknown
        ? undefined
        : // Promise / Map / Set 재귀 처리
          T extends Promise<infer U>
          ? Promise<Serialized<U>>
          : T extends Map<infer K, infer V>
            ? Map<Serialized<K>, Serialized<V>>
            : T extends ReadonlyMap<infer K, infer V>
              ? ReadonlyMap<Serialized<K>, Serialized<V>>
              : T extends Set<infer U>
                ? Set<Serialized<U>>
                : T extends ReadonlySet<infer U>
                  ? ReadonlySet<Serialized<U>>
                  : // Tuple / Array 재귀 처리
                    T extends []
                    ? []
                    : T extends readonly [infer F, ...infer R]
                      ? [Serialized<F>, ...{ [I in keyof R]: Serialized<R[I]> }]
                      : T extends Array<infer U>
                        ? Array<Serialized<U>>
                        : T extends ReadonlyArray<infer U>
                          ? ReadonlyArray<Serialized<U>>
                          : // Object(Record) 재귀 처리
                            T extends Record<PropertyKey, any>
                            ? { [K in keyof T]: Serialized<T[K]> }
                            : // 나머지는 직렬화 불가
                              undefined;

// * JSON 직렬화 타입 추론 (Jsonify)
// NOTE: Serializable하지 않은 타입은 loader와 action 함수에서 반환 시 타입 유실 발생하므로,
// NOTE: 타입 유실 방지를 위해 toJson 함수로 JSON 직렬화 반환하는 경우 사용
type JsonPrimitive = string | number | boolean | null;

// JSON으로 보낼 수 있는 값 형태
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

// 깊이 제한
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// 배열 원소는 undefined -> null (JSON.stringify 동작과 일치)
type ToJsonArrayElem<T, D extends number> =
  ToJsonValue<T, D> extends infer V ? (V extends undefined ? null : V) : never;

// 객체 undefined인 필드는 키 제거(omit)
type ToJsonObject<T extends Record<string, any>, D extends number> = {
  [K in keyof T as ToJsonValue<T[K], D> extends undefined ? never : K]: ToJsonValue<
    T[K],
    D
  > extends infer V
    ? V extends JsonValue
      ? V
      : never
    : never;
};

// JSON 타입 추론
type ToJsonValue<T, D extends number> = D extends 0
  ? JsonValue // 깊이 제한 도달 시 (TS 컴파일러 에러 방지)
  : T extends JsonPrimitive
    ? T // primitives
    : T extends undefined
      ? undefined
      : // JSON 불가
        T extends bigint | symbol | ((...args: any[]) => any)
        ? undefined
        : T extends ArrayBuffer | ArrayBufferView
          ? undefined
          : T extends Map<any, any> | Set<any>
            ? undefined
            : // 기본 ToJSON 메소드 변환
              T extends Date
              ? string
              : T extends URL
                ? string
                : T extends RegExp
                  ? string
                  : T extends Error
                    ? { name: string; message: string; stack?: string }
                    : // Promise는 내부만 변환
                      T extends Promise<infer U>
                      ? Promise<ToJsonValue<U, Prev[D] & number>>
                      : // 배열/튜플
                        T extends readonly any[]
                        ? { [K in keyof T]: ToJsonArrayElem<T[K], Prev[D] & number> }
                        : T extends Array<infer U>
                          ? Array<ToJsonArrayElem<U, Prev[D] & number>>
                          : T extends ReadonlyArray<infer U>
                            ? ReadonlyArray<ToJsonArrayElem<U, Prev[D] & number>>
                            : // object
                              T extends Record<string, any>
                              ? ToJsonObject<T, Prev[D] & number>
                              : undefined;

// JsonValue 형태로
export type ToJson<T, Depth extends number = 7> =
  ToJsonValue<T, Depth> extends infer V
    ? V extends JsonValue
      ? V
      : undefined
    : undefined;

// * DataWithResponseInit 타입 (React Router 내부 타입과 동일) */
export declare class DataWithResponseInit<D> {
  type: string;
  data: D;
  init: ResponseInit | null;
  constructor(data: D, init?: ResponseInit);
}

// ? 참조용 React Router Serialize 내부 타입
// declare class DataWithResponseInit<D> {
//   type: string;
//   data: D;
//   init: ResponseInit | null;
//   constructor(data: D, init?: ResponseInit);
// }
// type Equal<X, Y> =
//   (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
// type IsAny<T> = 0 extends 1 & T ? true : false;
// type Func = (...args: any[]) => unknown;
// type Pretty<T> = {
//   [K in keyof T]: T[K];
// } & {};
// type Normalize<T> = _Normalize<UnionKeys<T>, T>;
// type _Normalize<Key extends keyof any, T> = T extends infer U
//   ? Pretty<
//       {
//         [K in Key as K extends keyof U
//           ? undefined extends U[K]
//             ? never
//             : K
//           : never]: K extends keyof U ? U[K] : never;
//       } & {
//         [K in Key as K extends keyof U
//           ? undefined extends U[K]
//             ? K
//             : never
//           : never]?: K extends keyof U ? U[K] : never;
//       } & {
//         [K in Key as K extends keyof U ? never : K]?: undefined;
//       }
//     >
//   : never;
// type UnionKeys<T> = T extends any ? keyof T : never;
// type Serializable =
//   | undefined
//   | null
//   | boolean
//   | string
//   | symbol
//   | number
//   | Array<Serializable>
//   | {
//       [key: PropertyKey]: Serializable;
//     }
//   | bigint
//   | Date
//   | URL
//   | RegExp
//   | Error
//   | Map<Serializable, Serializable>
//   | Set<Serializable>
//   | Promise<Serializable>;
// type unstable_SerializesTo<T> = {
//   unstable__ReactRouter_SerializesTo: [T];
// };
// type Serialize<T> =
//   T extends unstable_SerializesTo<infer To>
//     ? To
//     : T extends Serializable
//       ? T
//       : T extends (...args: any[]) => unknown
//         ? undefined
//         : T extends Promise<infer U>
//           ? Promise<Serialize<U>>
//           : T extends Map<infer K, infer V>
//             ? Map<Serialize<K>, Serialize<V>>
//             : T extends ReadonlyMap<infer K, infer V>
//               ? ReadonlyMap<Serialize<K>, Serialize<V>>
//               : T extends Set<infer U>
//                 ? Set<Serialize<U>>
//                 : T extends ReadonlySet<infer U>
//                   ? ReadonlySet<Serialize<U>>
//                   : T extends []
//                     ? []
//                     : T extends readonly [infer F, ...infer R]
//                       ? [Serialize<F>, ...Serialize<R>]
//                       : T extends Array<infer U>
//                         ? Array<Serialize<U>>
//                         : T extends readonly unknown[]
//                           ? readonly Serialize<T[number]>[]
//                           : T extends Record<any, any>
//                             ? {
//                                 [K in keyof T]: Serialize<T[K]>;
//                               }
//                             : undefined;
// type VoidToUndefined<T> = Equal<T, void> extends true ? undefined : T;
// type DataFrom<T> =
//   IsAny<T> extends true
//     ? undefined
//     : T extends Func
//       ? VoidToUndefined<Awaited<ReturnType<T>>>
//       : undefined;
// type ClientData<T> = T extends Response
//   ? never
//   : T extends DataWithResponseInit<infer U>
//     ? U
//     : T;
// type ServerData<T> = T extends Response
//   ? never
//   : T extends DataWithResponseInit<infer U>
//     ? Serialize<U>
//     : Serialize<T>;
// type ServerDataFrom<T> = ServerData<DataFrom<T>>;
// type ClientDataFrom<T> = ClientData<DataFrom<T>>;
// type ClientLoaderFunctionArgs = LoaderFunctionArgs & {
//   serverLoader: <T = unknown>() => Promise<SerializeFrom<T>>;
// };
// type ClientActionFunctionArgs = ActionFunctionArgs & {
//   serverAction: <T = unknown>() => Promise<SerializeFrom<T>>;
// };
// type ClientDataFunctionArgs<Params> = {
//   request: Request;
//   params: Params;
//   unstable_pattern: string;
//   context: Readonly<RouterContextProvider>;
// };
// type SerializeFrom<T> = T extends (...args: infer Args) => unknown
//   ? Args extends [
//       | ClientLoaderFunctionArgs
//       | ClientActionFunctionArgs
//       | ClientDataFunctionArgs<unknown>,
//     ]
//     ? ClientDataFrom<T>
//     : ServerDataFrom<T>
//   : T;
