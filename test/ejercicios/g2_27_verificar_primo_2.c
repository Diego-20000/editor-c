#include <stdio.h>

int main() {
    int i;
    int N;
    int ES_PRIMO;

    N = 0;
    ES_PRIMO = 1;

    printf("Numero entero: ");
    scanf("%d", &N);

    if (N < 2) {
        ES_PRIMO = 0;
    } else {
        for (i = 2; i <= N / i && ES_PRIMO == 1; i++) {
            if (N % i == 0) {
                ES_PRIMO = 0;
            }
        }
    }

    if (ES_PRIMO == 1) {
        printf("%d es primo.\n", N);
    } else {
        printf("%d no es primo.\n", N);
    }
}
