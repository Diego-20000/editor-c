#include <stdio.h>
int main() {
 int CANALES[4] = {2, 4, 6, 8};
 int CANTIDAD = sizeof(CANALES) / sizeof(CANALES[0]);
 for (int I = 0; I < CANTIDAD; I++)
 printf("%d\n", CANALES[I]);
}
