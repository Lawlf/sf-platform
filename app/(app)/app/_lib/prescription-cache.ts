import { cache } from "react";

import { fetchPrescription } from "../_actions/prescription-queries";

export const getPrescription = cache(fetchPrescription);
