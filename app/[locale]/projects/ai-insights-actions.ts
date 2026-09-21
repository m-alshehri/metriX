"use server";
import { queueProjectAction } from "./pipeline-actions";
export async function generateProjectInsights(form: FormData) {
  return queueProjectAction(form, "insights");
}
