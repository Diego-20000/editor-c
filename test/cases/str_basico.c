#include <stdio.h>
#include <string.h>
int main() {
  char a[20] = "Hola";
  char b[] = "mundo";
  char c[30];
  int i;
  strcpy(c, a);
  strcat(c, " ");
  strcat(c, b);
  printf("[%s] [%s] [%s] len=%d\n", a, b, c, (int)strlen(c));
  printf("[%10s] [%-10s] [%.3s] [%5.2s]\n", a, b, c, b);
  printf("%d %d %d\n", strcmp(a, "Hola") == 0, strcmp("abc", "abd") < 0, strcmp("b", "a") > 0);
  printf("%d %d\n", strncmp("hello", "help", 3), strncmp("hello", "help", 4) < 0);
  for (i = 0; c[i] != '\0'; i++) printf("%c-", c[i]);
  printf("\n%d %d\n", (int)sizeof(a), (int)sizeof(b));
  c[4] = '\0';
  printf("%s|%d\n", c, (int)strlen(c));
  return 0;
}
