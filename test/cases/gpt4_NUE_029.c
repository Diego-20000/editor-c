#include <stdio.h>
int main() {
 int PAQUETES[3] = {4, 3, 2};
 int TOTAL = 0;
 for (int I = 0; I < 3; I++)
 TOTAL += PAQUETES[I];
 printf("Total: %d\n", TOTAL);
}
