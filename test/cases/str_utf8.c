#include <stdio.h>
#include <string.h>
int main() {
  char t[20] = "Descripción";
  int n = printf("[%-12s][%10s][%.2s]\n", t, "Año", "ñu");
  printf("%d %d\n", n, (int)strlen(t));
  return 0;
}
