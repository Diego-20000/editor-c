#include <stdio.h>
int main(void) {
    int TOTAL, H, M, S;
    scanf("%d", &TOTAL);
    if (TOTAL < 0 || TOTAL > 2000000000) return 0;
    H = TOTAL / 3600; M = (TOTAL % 3600) / 60; S = TOTAL % 60;
    printf("%d horas, %d minutos y %d segundos\n", H, M, S);
    return 0;
}
