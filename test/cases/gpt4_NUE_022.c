#include <stdio.h>
int DIFERENCIA(int INICIO, int FIN);
int main() {
 printf("Diferencia: %d\n", DIFERENCIA(20, 8));
}
int DIFERENCIA(int INICIO, int FIN) {
 return FIN - INICIO;
}
