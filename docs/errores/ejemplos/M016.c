#include <stdio.h>
int main(void) {
    char c; int a = 0, e = 0, o = 0;
    printf("Escriba letras y termine con *: ");
    scanf(" %c", &c);
    while (c != '*') {
        switch (c) {
            case 'a': case 'A': a++; break;
            case 'e': case 'E': e++; break;
            default: o++;
        }
        scanf(" %c", &c);
    }
    printf("a=%d e=%d otras=%d\n", a, e, o);
    long f = 1; int k;
    for (k = 1; k <= 15; k++) f *= k;
    printf("15! = %ld\n", f);
    unsigned int x = 5; x -= 10; printf("%u\n", x);
    float t = 36.6; int ent = t; printf("%d %.1f %c\n", ent, t, 'a' + 2);
    double d = 10 / 4; printf("%.2f %.2f\n", d, 10 / 4.0);
    printf("%d\n", 'a');
    printf("%5.1f|%-8d|%8s|\n", 3.14159, 42, "ok");
    return 0;
}
