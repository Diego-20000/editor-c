#include <stdio.h>
void CAMBIAR(int VALOR);
int main() {
    int ORIGINAL = 7;
    CAMBIAR(ORIGINAL);
    printf("%d\n", ORIGINAL);
}
void CAMBIAR(int VALOR) {
    VALOR = 99;
    printf("%d\n", VALOR);
}
