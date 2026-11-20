#include <stdio.h>

int main() {
    int i;
    int j;
    int MATRIZ[2][3];

    for (i = 0; i < 2; i++) {
        for (j = 0; j < 3; j++) {
            printf("Elemento [%d][%d]: ", i + 1, j + 1);
            scanf("%d", &MATRIZ[i][j]);
        }
    }

    printf("Matriz original:\n");
    for (i = 0; i < 2; i++) {
        for (j = 0; j < 3; j++) {
            printf("%5d", MATRIZ[i][j]);
        }
        printf("\n");
    }

    printf("Matriz transpuesta:\n");
    for (j = 0; j < 3; j++) {
        for (i = 0; i < 2; i++) {
            printf("%5d", MATRIZ[i][j]);
        }
        printf("\n");
    }
}
