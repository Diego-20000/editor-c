#include <stdio.h>
#include <string.h>
#include <ctype.h>
int main() {
  char nombre[30], apellido[30], linea[80];
  int edad, i, vocales = 0;
  scanf("%s %s %d", nombre, apellido, &edad);
  printf("Hola %s %s, tenes %d anios\n", nombre, apellido, edad);
  scanf(" %79[^\n]", linea);
  for (i = 0; i < strlen(linea); i++) {
    char c = tolower(linea[i]);
    if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') vocales++;
  }
  printf("'%s' tiene %d vocales y %d caracteres\n", linea, vocales, (int)strlen(linea));
  return 0;
}
