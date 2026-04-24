async function test() {
  const res = await fetch("http://localhost:8080/api/gtts?ie=UTF-8&q=hello&tl=hi&client=tw-ob");
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 50));
}
test();
