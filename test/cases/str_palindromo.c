#include <stdio.h>
#include <string.h>
int es_pal(char s[]) {
  int i = 0, j = strlen(s) - 1;
  while (i < j) {
    if (s[i] != s[j]) return 0;
    i++; j--;
  }
  return 1;
}
void invertir(char s[]) {
  int i, n = strlen(s);
  char t;
  for (i = 0; i < n / 2; i++) { t = s[i]; s[i] = s[n - 1 - i]; s[n - 1 - i] = t; }
}
int main() {
  char p[40];
  while (scanf("%39s", p) == 1) {
    printf("%s -> %s\n", p, es_pal(p) ? "palindromo" : "no");
    invertir(p);
    printf("invertida: %s\n", p);
  }
  printf("%d %d\n", es_pal("neuquen"), es_pal("hola"));
  return 0;
}
