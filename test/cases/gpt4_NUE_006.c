#include <stdio.h>
int main() {
 int HUMEDAD = 90;
 if (HUMEDAD > 40) {
 if (HUMEDAD < 80)
 printf("Humedad normal\n");
 else
 printf("Humedad alta\n");
 } else {
 printf("Humedad baja\n");
 }
}
