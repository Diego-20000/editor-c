#include <stdio.h>

int main() {
    int i;
    int NUMEROS[8];

    for (i = 0; i < 8; i++) {
        printf("Numero %d: ", i + 1);
        scanf("%d", &NUMEROS[i]);
    }

    printf("Orden original: ");
    for (i = 0; i < 8; i++) {
        printf("%d ", NUMEROS[i]);
    }

    printf("\nOrden inverso: ");
    for (i = 7; i >= 0; i--) {
        printf("%d ", NUMEROS[i]);
    }
    printf("\n");
}
