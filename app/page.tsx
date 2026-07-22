import { redirect } from "next/navigation";

export default function Home() {
  redirect("/my-water?household=HH-0001");
}
