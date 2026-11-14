#include <stdio.h>
int NIVEL_ALERTA(int SENSOR) {
 if (SENSOR > 50)
 return 1;
 return 0;
}
int main() {
 printf("Alerta: %d\n", NIVEL_ALERTA(30));
}
