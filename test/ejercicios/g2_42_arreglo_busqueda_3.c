#include <stdio.h>

int main() {
    int i;
    int VALORES[9];
    int BUSCADO;
    int CANTIDAD;

    BUSCADO = 0;
    CANTIDAD = 0;

    for (i = 0; i < 9; i++) {
        printf("Valor %d: ", i + 1);
        scanf("%d", &VALORES[i]);
    }

    printf("Valor que desea buscar: ");
    scanf("%d", &BUSCADO);

    for (i = 0; i < 9; i++) {
        if (VALORES[i] == BUSCADO) {
            printf("Encontrado en la posicion %d.\n", i + 1);
            CANTIDAD = CANTIDAD + 1;
        }
    }

    if (CANTIDAD == 0) {
        printf("El valor no aparece en el arreglo.\n");
    } else {
        printf("Cantidad de apariciones: %d\n", CANTIDAD);
    }
}
