/**
 * EPUBCheck JSON output types
 */

export interface EpubCheckResult {
  checker: CheckerInfo;
  publication: PublicationInfo;
  items: ItemInfo[];
  messages: Message[];
}

export interface CheckerInfo {
  path: string;
  filename: string;
  checkerVersion: string;
  checkDate: string;
  elapsedTime: number;
  nFatal: number;
  nError: number;
  nWarning: number;
  nUsage: number;
}

export interface PublicationInfo {
  publisher?: string;
  title?: string;
  creator?: string[];
  date?: string;
  subject?: string[];
  description?: string;
  rights?: string;
  identifier?: string;
  language?: string;
  nSpines: number;
  checkSum?: number;
  renditionLayout?: string;
  renditionOrientation?: string;
  renditionSpread?: string;
  ePubVersion?: string;
  isBackwardCompatible?: boolean;
  hasAudio?: boolean;
  hasVideo?: boolean;
  hasFixedFormat?: boolean;
  hasScripts?: boolean;
  hasEncryption?: boolean;
  hasSignatures?: boolean;
  isScripted?: boolean;
  embeddedFonts?: string[];
  refFonts?: string[];
  hasRemoteResources?: boolean;
  references?: string[];
}

export interface ItemInfo {
  id?: string;
  fileName: string;
  media_type: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod?: string;
  checkSum?: string;
  isSpineItem?: boolean;
  spineIndex?: number;
  isLinear?: boolean;
  navigationOrder?: number;
  isFixed?: boolean;
  renditionLayout?: string;
  renditionOrientation?: string;
  renditionSpread?: string;
  referencedItems?: string[];
}

export interface Message {
  ID: string;
  severity: Severity;
  message: string;
  additionalLocations: number;
  locations: Location[];
  suggestion?: string;
}

export type Severity = "FATAL" | "ERROR" | "WARNING" | "INFO" | "USAGE";

export interface Location {
  path: string;
  line: number;
  column: number;
  context?: string;
}

export type ValidateMode = "epub" | "opf" | "xhtml" | "svg" | "nav" | "mo";

export type ValidateProfile =
  | "default"
  | "dict"
  | "edupub"
  | "idx"
  | "preview";

export interface ValidateOptions {
  path: string;
  mode?: ValidateMode;
  profile?: ValidateProfile;
  version?: "2.0" | "3.0";
}
