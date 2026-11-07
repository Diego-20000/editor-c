#include <stdio.h>
#include <string.h>
int main() {
  char nombres[3][12] = {"Ana", "Luis", "Maria"};
  char *dias[] = {"lunes", "martes", "miercoles"};
  char *saludo = "Buen dia";
  int i;
  for (i = 0; i < 3; i++) printf("%d) %-8s|%s\n", i, nombres[i], dias[i]);
  printf("%s, %s!\n", saludo, nombres[2]);
  strcpy(nombres[1], "Pedro");
  printf("%s %d %c\n", nombres[1], (int)strlen(dias[2]), dias[1][2]);
  return 0;
}
