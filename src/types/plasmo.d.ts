declare module "plasmo" {
  export interface PlasmoCSConfig {
    matches: string[];
    all_frames?: boolean;
  }

  export interface PlasmoContentScript {
    config?: PlasmoCSConfig;
  }
} 