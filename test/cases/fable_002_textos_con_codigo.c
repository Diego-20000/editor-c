#include <stdio.h>
#include <string.h>
int main() {
    char s[200] = "\"); globalThis.PWNED = 1; (\"";
    char t[100] = "${globalThis.PWNED=2}`+globalThis.PWNED+`";
    printf("</script><img src=x onerror=alert(1)>\n");
    printf("%s|%s\n", s, t);
    printf("\\\" ' \\n */ /* // \x41\102 \\u2028 %%d %c\n", '\'');
    printf("a\\"); printf("\n\"); globalThis.PWNED=3; //\n");
    puts("\\"); puts("\"+globalThis.PWNED+\"");
    printf("%d\n", (int)strlen("\\\\\""));
    return 0;
}
