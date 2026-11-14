#include <stdio.h>
int REGISTRAR(void) {
 printf("Registro ejecutado\n");
 return 1;
}
int main() {
 int ALARMA = 1;
 if (ALARMA == 1 || REGISTRAR())
 printf("Alarma activa\n");
}
