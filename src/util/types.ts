export interface ExtraParams {
  /** Optional ID(s) of geographies to operate on. **/
  geographies?: string[];
}

export interface GeoProp {
  geographyId: string;
}

export interface Geography {
  geographyId: string;
  datasourceId: string;
  display: string;
}

export interface BathymetryResults {
  /** minimum depth in sketch */
  min: number;
  /** maximum depth in sketch */
  max: number;
  /** avg depth in sketch */
  mean: number;
  units: string;
}
